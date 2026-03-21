import type { AgentDefinition, ActionCategory, AgentContext } from '@/lib/types/agents';
import { createServiceClient } from '@/lib/supabase/server';

interface ApprovalCheck {
  required: boolean;
  reason: string;
  assignedRole: string;
}

// Autonomy level determines what actions can proceed without human approval
// L0: All actions require approval
// L1: Read actions auto-approve; write/regulatory require approval
// L2: Read + write auto-approve; regulatory requires approval
// L3: All actions auto-approve (not yet used)
const AUTONOMY_PERMISSIONS: Record<string, ActionCategory[]> = {
  L0: [],
  L1: ['read'],
  L2: ['read', 'write'],
  L3: ['read', 'write', 'regulatory'],
};

export function checkApprovalRequired(
  agent: AgentDefinition,
  actionCategory: ActionCategory,
  confidence: number
): ApprovalCheck {
  const autoApprovedCategories = AUTONOMY_PERMISSIONS[agent.autonomyLevel] ?? [];

  // Regulatory actions always need licensed broker approval
  if (actionCategory === 'regulatory') {
    return {
      required: true,
      reason: 'Regulatory actions require licensed broker approval',
      assignedRole: 'broker_lead',
    };
  }

  // If confidence is below the agent's threshold, require approval
  if (confidence < agent.confidenceThreshold) {
    return {
      required: true,
      reason: `Confidence ${confidence.toFixed(2)} is below threshold ${agent.confidenceThreshold}`,
      assignedRole: 'ops_manager',
    };
  }

  // Check autonomy level permissions
  if (!autoApprovedCategories.includes(actionCategory)) {
    return {
      required: true,
      reason: `Agent autonomy level ${agent.autonomyLevel} requires approval for "${actionCategory}" actions`,
      assignedRole: actionCategory === 'write' ? 'ops_manager' : 'admin',
    };
  }

  return {
    required: false,
    reason: 'Action within agent autonomy level and confidence threshold',
    assignedRole: '',
  };
}

export async function createApprovalTask(
  agent: AgentDefinition,
  action: string,
  context: AgentContext,
  proposedOutput: Record<string, unknown>,
  confidence: number,
  reason: string,
  assignedRole: string
): Promise<string> {
  const supabase = createServiceClient();

  // Find a user with the required role in this tenant
  const { data: assignee } = await supabase
    .from('users')
    .select('id')
    .eq('tenant_id', context.tenantId)
    .eq('role', assignedRole)
    .eq('is_active', true)
    .limit(1)
    .single();

  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      tenant_id: context.tenantId,
      entry_case_id: context.caseId ?? null,
      assigned_user_id: assignee?.id ?? null,
      title: `[AI Review] ${agent.name}: ${action}`,
      description: `Agent "${agent.name}" requires human approval.\nReason: ${reason}\nConfidence: ${(confidence * 100).toFixed(0)}%\n\nReview the proposed action and approve or reject.`,
      task_type: 'approval',
      status: 'pending',
      priority: confidence < 0.5 ? 'high' : 'normal',
      due_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create approval task: ${error.message}`);
  }

  // Log audit event for the approval request
  await supabase.from('audit_events').insert({
    tenant_id: context.tenantId,
    event_type: 'agent_approval_requested',
    entity_type: 'task',
    entity_id: task.id,
    actor_type: 'agent',
    actor_id: agent.id,
    action: `Approval requested for: ${action}`,
    details: {
      agent_id: agent.id,
      confidence,
      reason,
      proposed_output: proposedOutput,
    },
  });

  return task.id;
}
