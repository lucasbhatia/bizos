import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { initializeAgents } from '@/lib/agents/init';
import { calculateAllAgentScores } from '@/lib/agents/promotion';
import { z } from 'zod';

export async function GET() {
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

  const scores = await calculateAllAgentScores(profile.tenant_id);

  return NextResponse.json({ scores });
}

const promotionActionSchema = z.object({
  agentId: z.string().min(1),
  action: z.enum(['promote', 'demote']),
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

  // Admin only
  if (profile.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = promotionActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { agentId, action } = parsed.data;

  // Log the promotion/demotion decision as an audit event
  await supabase.from('audit_events').insert({
    tenant_id: profile.tenant_id,
    event_type: `agent_${action}`,
    entity_type: 'agent',
    entity_id: agentId,
    actor_type: 'user' as const,
    actor_id: profile.id,
    action: `Agent ${agentId} ${action}d by admin`,
    details: { agent_id: agentId, action },
  });

  return NextResponse.json({
    success: true,
    message: `Agent ${agentId} ${action} recorded. Registry update will take effect on next deployment.`,
  });
}
