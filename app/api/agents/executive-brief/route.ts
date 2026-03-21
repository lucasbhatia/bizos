import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { executeAgent } from '@/lib/agents/runner';
import { initializeAgents } from '@/lib/agents/init';
import { z } from 'zod';

const briefSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
});

export async function POST(request: NextRequest) {
  initializeAgents();

  const supabase = createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('users')
    .select('id, tenant_id, role')
    .eq('id', authUser.id)
    .single();

  if (!profile) {
    return NextResponse.json(
      { error: 'User profile not found' },
      { status: 403 }
    );
  }

  const allowedRoles = ['admin', 'ops_manager'];
  if (!allowedRoles.includes(profile.role)) {
    return NextResponse.json(
      { error: 'Insufficient permissions. Only admin and ops_manager can generate briefs.' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = briefSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { startDate, endDate } = parsed.data;

  try {
    const result = await executeAgent(
      'executive-brief',
      {
        data: { startDate, endDate },
        trigger: `Executive brief requested for ${startDate} to ${endDate}`,
      },
      {
        tenantId: profile.tenant_id,
        userId: profile.id,
        triggerEvent: 'executive_brief_request',
      },
      'read'
    );

    return NextResponse.json({
      success: result.output.success,
      result: result.output.result,
      confidence: result.output.confidence,
      citations: result.output.citations,
      approvalRequired: result.approvalRequired,
      logId: result.logId,
      error: result.output.error,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Executive brief generation failed: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
