import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/supabase/auth-api';
import { executeAgent } from '@/lib/agents/runner';
import { hasAgent } from '@/lib/agents/registry';
import { initializeAgents } from '@/lib/agents/init';
import type { ActionCategory } from '@/lib/types/agents';
import { z } from 'zod';

const invokeSchema = z.object({
  agentId: z.string().min(1),
  input: z.object({
    data: z.record(z.unknown()),
    trigger: z.string(),
  }),
  caseId: z.string().uuid().optional(),
  actionCategory: z.enum(['read', 'write', 'regulatory']).default('write'),
});

export async function POST(request: NextRequest) {
  // Ensure agents are registered
  initializeAgents();

  // Authenticate
  const auth = await authenticateApiRequest();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user profile for tenant_id and role check
  // Only certain roles can invoke agents
  const allowedRoles = ['admin', 'broker_lead', 'ops_manager', 'specialist'];
  if (!allowedRoles.includes(auth.role)) {
    return NextResponse.json({ error: 'Insufficient permissions to invoke agents' }, { status: 403 });
  }

  // Parse and validate body
  const body = await request.json();
  const parsed = invokeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { agentId, input, caseId, actionCategory } = parsed.data;

  // Check agent exists
  if (!hasAgent(agentId)) {
    return NextResponse.json({ error: `Agent "${agentId}" not found` }, { status: 404 });
  }

  try {
    const result = await executeAgent(
      agentId,
      input,
      {
        tenantId: auth.tenantId,
        userId: auth.userId,
        caseId,
        triggerEvent: input.trigger,
      },
      actionCategory as ActionCategory
    );

    return NextResponse.json({
      success: result.output.success,
      result: result.output.result,
      confidence: result.output.confidence,
      citations: result.output.citations,
      approvalRequired: result.approvalRequired,
      approvalTaskId: result.approvalTaskId,
      logId: result.logId,
      error: result.output.error,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Agent invocation failed: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
