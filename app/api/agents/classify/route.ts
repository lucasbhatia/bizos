import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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
  const parsed = classifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
  }

  const result = await executeAgent(
    'classification-support',
    { data: parsed.data, trigger: 'classification_requested' },
    {
      tenantId: profile.tenant_id,
      userId: profile.id,
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
}
