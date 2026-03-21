import { getAgent } from './registry';
import { checkApprovalRequired, createApprovalTask } from './approval';
import { createServiceClient } from '@/lib/supabase/server';
import type {
  AgentInput,
  AgentContext,
  AgentOutput,
  ActionCategory,
} from '@/lib/types/agents';

interface ExecuteResult {
  output: AgentOutput;
  approvalRequired: boolean;
  approvalTaskId?: string;
  logId: string;
}

export async function executeAgent(
  agentId: string,
  input: AgentInput,
  context: AgentContext,
  actionCategory: ActionCategory = 'write'
): Promise<ExecuteResult> {
  const agent = getAgent(agentId);
  if (!agent) {
    throw new Error(`Agent "${agentId}" not found in registry`);
  }

  const supabase = createServiceClient();

  // Log the start of execution
  const startLogId = await logAgentAction(supabase, {
    agentType: agent.id,
    tenantId: context.tenantId,
    entryCaseId: context.caseId ?? null,
    action: `${agent.name} invoked: ${input.trigger}`,
    inputs: input.data,
    outputs: {},
    confidence: null,
    citations: [],
    phase: 'started',
  });

  let output: AgentOutput;

  try {
    output = await agent.handler(input, context);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Log the failure
    await updateAgentLog(supabase, startLogId, {
      outputs: { error: errorMessage },
      confidence: 0,
      phase: 'failed',
    });

    return {
      output: {
        success: false,
        result: {},
        confidence: 0,
        citations: [],
        error: errorMessage,
      },
      approvalRequired: false,
      logId: startLogId,
    };
  }

  // Check if approval is required
  const approvalCheck = checkApprovalRequired(agent, actionCategory, output.confidence);

  let approvalTaskId: string | undefined;

  if (approvalCheck.required) {
    approvalTaskId = await createApprovalTask(
      agent,
      input.trigger,
      context,
      output.result,
      output.confidence,
      approvalCheck.reason,
      approvalCheck.assignedRole
    );
  }

  // Log the completion
  await updateAgentLog(supabase, startLogId, {
    outputs: output.result,
    confidence: output.confidence,
    citations: output.citations,
    phase: 'completed',
    humanDecision: approvalCheck.required ? 'pending' : null,
  });

  return {
    output,
    approvalRequired: approvalCheck.required,
    approvalTaskId,
    logId: startLogId,
  };
}

async function logAgentAction(
  supabase: ReturnType<typeof createServiceClient>,
  entry: {
    agentType: string;
    tenantId: string;
    entryCaseId: string | null;
    action: string;
    inputs: Record<string, unknown>;
    outputs: Record<string, unknown>;
    confidence: number | null;
    citations: unknown[];
    phase: string;
  }
): Promise<string> {
  const { data, error } = await supabase
    .from('ai_action_logs')
    .insert({
      tenant_id: entry.tenantId,
      agent_type: entry.agentType,
      entry_case_id: entry.entryCaseId,
      action: entry.action,
      inputs: entry.inputs,
      outputs: entry.outputs,
      confidence: entry.confidence,
      citations: entry.citations,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to log agent action:', error.message);
    // Return a placeholder ID rather than crashing the agent
    return 'log-failed';
  }

  return data.id;
}

async function updateAgentLog(
  supabase: ReturnType<typeof createServiceClient>,
  logId: string,
  update: {
    outputs?: Record<string, unknown>;
    confidence?: number;
    citations?: unknown[];
    phase?: string;
    humanDecision?: string | null;
  }
): Promise<void> {
  if (logId === 'log-failed') return;

  const updateData: Record<string, unknown> = {};
  if (update.outputs !== undefined) updateData.outputs = update.outputs;
  if (update.confidence !== undefined) updateData.confidence = update.confidence;
  if (update.citations !== undefined) updateData.citations = update.citations;
  if (update.humanDecision !== undefined) updateData.human_decision = update.humanDecision;

  const { error } = await supabase
    .from('ai_action_logs')
    .update(updateData)
    .eq('id', logId);

  if (error) {
    console.error('Failed to update agent log:', error.message);
  }
}
