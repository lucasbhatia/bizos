import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/supabase/auth-api';
import { createServiceClient } from '@/lib/supabase/server';
import { initializeAgents } from '@/lib/agents/init';
import { calculateAllAgentScores } from '@/lib/agents/promotion';
import { z } from 'zod';

export async function GET() {
  initializeAgents();

  const auth = await authenticateApiRequest();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  const scores = await calculateAllAgentScores(auth.tenantId);

  return NextResponse.json({ scores });
}

const promotionActionSchema = z.object({
  agentId: z.string().min(1),
  action: z.enum(['promote', 'demote']),
});

export async function POST(request: NextRequest) {
  initializeAgents();

  const auth = await authenticateApiRequest();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  // Admin only
  if (auth.role !== 'admin') {
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
    tenant_id: auth.tenantId,
    event_type: `agent_${action}`,
    entity_type: 'agent',
    entity_id: agentId,
    actor_type: 'user' as const,
    actor_id: auth.userId,
    action: `Agent ${agentId} ${action}d by admin`,
    details: { agent_id: agentId, action },
  });

  return NextResponse.json({
    success: true,
    message: `Agent ${agentId} ${action} recorded. Registry update will take effect on next deployment.`,
  });
}
