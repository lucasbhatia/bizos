import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { executeAgent } from '@/lib/agents/runner';
import { initializeAgents } from '@/lib/agents/init';
import { z } from 'zod';

const financeSchema = z.object({
  caseId: z.string().uuid(),
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
  const parsed = financeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const result = await executeAgent(
    'finance-agent',
    { data: { caseId: parsed.data.caseId }, trigger: 'billing_status' },
    {
      tenantId: profile.tenant_id,
      userId: profile.id,
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
}
