import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/supabase/auth-api';
import { executeAgent } from '@/lib/agents/runner';
import { initializeAgents } from '@/lib/agents/init';
import { z } from 'zod';

const financeSchema = z.object({
  caseId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  initializeAgents();

  const auth = await authenticateApiRequest();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json();
  const parsed = financeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  try {
    const result = await executeAgent(
      'finance-agent',
      { data: { caseId: parsed.data.caseId }, trigger: 'billing_status' },
      {
        tenantId: auth.tenantId,
        userId: auth.userId,
        caseId: parsed.data.caseId,
        triggerEvent: 'billing_status',
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
    console.error(`Finance agent invocation failed: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
