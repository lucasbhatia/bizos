import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/supabase/auth-api';
import { executeAgent } from '@/lib/agents/runner';
import { initializeAgents } from '@/lib/agents/init';

export async function POST(request: NextRequest) {
  initializeAgents();

  const auth = await authenticateApiRequest();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!['admin', 'ops_manager'].includes(auth.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    const result = await executeAgent(
      'ops-coordinator',
      { data: {}, trigger: 'manual_run' },
      {
        tenantId: auth.tenantId,
        userId: auth.userId,
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
