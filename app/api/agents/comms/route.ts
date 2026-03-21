import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/supabase/auth-api';
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

  const auth = await authenticateApiRequest();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
        tenantId: auth.tenantId,
        userId: auth.userId,
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
