import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/supabase/auth-api';
import { createServiceClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/sender';
import { z } from 'zod';

const sendEmailSchema = z.object({
  caseId: z.string().uuid(),
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
  eventType: z.string().min(1),
  draftIndex: z.number().int().min(0).optional(),
});

export async function POST(request: NextRequest) {
  // 1. Authenticate user
  const auth = await authenticateApiRequest();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // 2. Validate request body
  const rawBody: unknown = await request.json();
  const parsed = sendEmailSchema.safeParse(rawBody);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { caseId, to, subject, body, eventType, draftIndex } = parsed.data;

  // 3. Send email via Gmail
  const result = await sendEmail(auth.tenantId, to, subject, body);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error ?? 'Failed to send email' },
      { status: 500 }
    );
  }

  // 4. Update comm draft status in case metadata
  const serviceClient = createServiceClient();

  const { data: entryCase } = await serviceClient
    .from('entry_cases')
    .select('metadata, tenant_id')
    .eq('id', caseId)
    .eq('tenant_id', auth.tenantId)
    .single();

  if (entryCase) {
    const metadata = (entryCase.metadata ?? {}) as Record<string, unknown>;
    const drafts = Array.isArray(metadata.comm_drafts)
      ? (metadata.comm_drafts as Record<string, unknown>[])
      : [];

    // Mark the specific draft as sent (if draftIndex provided)
    if (draftIndex !== undefined && draftIndex < drafts.length) {
      drafts[draftIndex] = {
        ...drafts[draftIndex],
        status: 'sent',
        sent_at: new Date().toISOString(),
        gmail_message_id: result.messageId,
      };
    }

    // Append to sent_emails log
    const sentEmails = Array.isArray(metadata.sent_emails)
      ? (metadata.sent_emails as Record<string, unknown>[])
      : [];

    sentEmails.push({
      to,
      subject,
      body,
      event_type: eventType,
      sent_at: new Date().toISOString(),
      sent_by: auth.userId,
      gmail_message_id: result.messageId,
    });

    metadata.comm_drafts = drafts;
    metadata.sent_emails = sentEmails;

    await serviceClient
      .from('entry_cases')
      .update({ metadata })
      .eq('id', caseId);
  }

  // 5. Log to audit_events
  await serviceClient.from('audit_events').insert({
    tenant_id: auth.tenantId,
    event_type: 'email.sent',
    entity_type: 'entry_case',
    entity_id: caseId,
    actor_type: 'user',
    actor_id: auth.userId,
    action: `Sent ${eventType} email to ${to}`,
    details: {
      to,
      subject,
      event_type: eventType,
      gmail_message_id: result.messageId,
    },
  });

  return NextResponse.json({
    success: true,
    messageId: result.messageId,
  });
}
