import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { executeAgent } from '@/lib/agents/runner';
import { initializeAgents } from '@/lib/agents/init';

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

  // Only admin and ops_manager can trigger ops check
  if (!['admin', 'ops_manager'].includes(profile.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const result = await executeAgent(
    'ops-coordinator',
    { data: {}, trigger: 'manual_run' },
    {
      tenantId: profile.tenant_id,
      userId: profile.id,
      triggerEvent: 'manual_run',
    },
    'write'
  );

  return NextResponse.json({
    success: result.output.success,
    result: result.output.result,
    logId: result.logId,
    error: result.output.error,
  });
}
