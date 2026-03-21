import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/supabase/auth-api';
import { executeAgent } from '@/lib/agents/runner';
import { initializeAgents } from '@/lib/agents/init';
import { z } from 'zod';

const intakeSchema = z.object({
  from: z.string().min(1),
  to: z.string().optional(),
  subject: z.string().min(1),
  body: z.string().min(1),
  attachmentNames: z.array(z.string()).default([]),
  clientAccountId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  initializeAgents();

  const auth = await authenticateApiRequest();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json();
  const parsed = intakeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await executeAgent(
      'intake-agent',
      { data: parsed.data, trigger: 'email_received' },
      {
        tenantId: auth.tenantId,
        userId: auth.userId,
        triggerEvent: 'email_received',
      },
      'write'
    );

    return NextResponse.json({
      success: result.output.success,
      result: result.output.result,
      confidence: result.output.confidence,
      approvalRequired: result.approvalRequired,
      logId: result.logId,
      error: result.output.error,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Intake agent invocation failed: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
