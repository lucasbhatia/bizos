import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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

  const body = await request.json();
  const parsed = intakeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
  }

  const result = await executeAgent(
    'intake-agent',
    { data: parsed.data, trigger: 'email_received' },
    {
      tenantId: profile.tenant_id,
      userId: profile.id,
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
}
