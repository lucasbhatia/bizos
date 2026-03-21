import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getStoredTokens,
  getGmailClient,
  listMessages,
  getMessage,
  parseEmailMessage,
  getProcessedMessageIds,
  markMessagesProcessed,
} from '@/lib/email/gmail';
import { executeAgent } from '@/lib/agents/runner';
import { initializeAgents } from '@/lib/agents/init';
import type { ParsedEmail } from '@/lib/email/gmail';

interface SyncResultItem {
  messageId: string;
  subject: string;
  from: string;
  success: boolean;
  confidence: number | null;
  error: string | null;
}

const ALLOWED_ROLES = ['admin', 'ops_manager'] as const;

export async function POST() {
  initializeAgents();

  const supabase = createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('users')
    .select('id, tenant_id, role')
    .eq('id', authUser.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'User profile not found' }, { status: 403 });
  }

  const roleAllowed = (ALLOWED_ROLES as readonly string[]).includes(profile.role);
  if (!roleAllowed) {
    return NextResponse.json(
      { error: 'Only admin or ops_manager can trigger email sync' },
      { status: 403 }
    );
  }

  // Get stored Gmail tokens
  const tokens = await getStoredTokens(profile.tenant_id);
  if (!tokens) {
    return NextResponse.json(
      { error: 'Gmail not connected. Please connect Gmail in Settings first.' },
      { status: 400 }
    );
  }

  const gmailClient = getGmailClient(tokens);

  // Fetch recent unread messages
  const messageStubs = await listMessages(
    gmailClient,
    'is:unread category:primary',
    20
  );

  if (messageStubs.length === 0) {
    return NextResponse.json({
      processed: 0,
      results: [],
      message: 'No unread emails found',
    });
  }

  // Filter out already-processed messages
  const processedIds = await getProcessedMessageIds(profile.tenant_id);
  const newStubs = messageStubs.filter(
    (m) => m.id && !processedIds.has(m.id)
  );

  if (newStubs.length === 0) {
    return NextResponse.json({
      processed: 0,
      results: [],
      message: 'All unread emails have already been processed',
    });
  }

  const results: SyncResultItem[] = [];
  const processedNewIds: string[] = [];

  for (const stub of newStubs) {
    if (!stub.id) continue;

    let email: ParsedEmail;
    try {
      const fullMessage = await getMessage(gmailClient, stub.id);
      email = parseEmailMessage(fullMessage);
    } catch (err) {
      results.push({
        messageId: stub.id,
        subject: '',
        from: '',
        success: false,
        confidence: null,
        error: err instanceof Error ? err.message : 'Failed to fetch message',
      });
      continue;
    }

    // Run through Intake Agent
    try {
      const agentResult = await executeAgent(
        'intake-agent',
        {
          data: {
            from: email.from,
            to: email.to,
            subject: email.subject,
            body: email.body,
            attachmentNames: email.attachmentNames,
          },
          trigger: 'gmail_sync',
        },
        {
          tenantId: profile.tenant_id,
          userId: profile.id,
          triggerEvent: 'gmail_sync',
        },
        'write'
      );

      results.push({
        messageId: email.messageId,
        subject: email.subject,
        from: email.from,
        success: agentResult.output.success,
        confidence: agentResult.output.confidence,
        error: agentResult.output.error ?? null,
      });

      processedNewIds.push(email.messageId);
    } catch (err) {
      results.push({
        messageId: email.messageId,
        subject: email.subject,
        from: email.from,
        success: false,
        confidence: null,
        error: err instanceof Error ? err.message : 'Agent execution failed',
      });

      // Still mark as processed to avoid retrying on every sync
      processedNewIds.push(email.messageId);
    }
  }

  // Persist processed message IDs
  if (processedNewIds.length > 0) {
    await markMessagesProcessed(profile.tenant_id, processedNewIds);
  }

  return NextResponse.json({
    processed: processedNewIds.length,
    results,
    message: `Processed ${processedNewIds.length} new emails`,
  });
}
