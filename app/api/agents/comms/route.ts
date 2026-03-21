import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { executeAgent } from '@/lib/agents/runner';
import { initializeAgents } from '@/lib/agents/init';
import { z } from 'zod';

const commsSchema = z.object({
  caseId: z.string().uuid(),
  eventType: z.enum(['missing_documents', 'status_update', 'hold_notification', 'clearance_notification']),
  additionalContext: z.string().optional(),
});

export async function POST(request: NextRequest) {
  initializeAgents();

  const supabase = createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('users')
    .select('id, tenant_id')
    .eq('id', authUser.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'User profile not found' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = commsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await executeAgent(
      'client-comms',
      { data: parsed.data, trigger: `comms_${parsed.data.eventType}` },
      {
        tenantId: profile.tenant_id,
        userId: profile.id,
        caseId: parsed.data.caseId,
        triggerEvent: `comms_${parsed.data.eventType}`,
      },
      'write'
    );

    return NextResponse.json({
      success: result.output.success,
      result: result.output.result,
      confidence: result.output.confidence,
      logId: result.logId,
      error: result.output.error,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Client comms agent invocation failed: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
