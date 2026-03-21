import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/supabase/auth-api';
import { executeAgent } from '@/lib/agents/runner';
import { initializeAgents } from '@/lib/agents/init';
import { z } from 'zod';

const classifySchema = z.object({
  productDescription: z.string().min(1),
  materials: z.string().optional(),
  use: z.string().optional(),
  composition: z.string().optional(),
  countryOfOrigin: z.string().optional(),
  caseId: z.string().uuid().optional(),
  lineItemIndex: z.number().optional(),
});

export async function POST(request: NextRequest) {
  initializeAgents();

  const auth = await authenticateApiRequest();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json();
  const parsed = classifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await executeAgent(
      'classification-support',
      { data: parsed.data, trigger: 'classification_requested' },
      {
        tenantId: auth.tenantId,
        userId: auth.userId,
        caseId: parsed.data.caseId,
        triggerEvent: 'classification_requested',
      },
      'regulatory'
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
    console.error(`Classification agent invocation failed: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
