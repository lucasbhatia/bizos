import { registerAgent } from '@/lib/agents/registry';
import { callClaude } from '@/lib/agents/llm';
import { createServiceClient } from '@/lib/supabase/server';
import type { AgentInput, AgentContext, AgentOutput } from '@/lib/types/agents';

const SYSTEM_PROMPT = `You are the Executive Brief Agent for BizOS, a customs brokerage operating system.

Your job is to analyze daily operational activity and generate a concise executive summary for brokerage leadership.

You will receive data about:
- Cases created, updated, and closed during the period
- Agent activity (invocations, approvals, rejections)
- Financial activity (invoices created, payments received)
- Any exceptions or anomalies

Generate a structured brief with these sections:

1. **Overview**: A 2-3 sentence summary of the day's operations. Include key numbers.
2. **Exceptions**: Any items needing executive attention — stuck cases, rejected agent actions, overdue items, holds, or anomalies. If none, say "No exceptions to report."
3. **Achievements**: Positive outcomes — cases closed, successful AI classifications, payments received. If none, say "No notable achievements today."
4. **Recommendations**: 1-3 actionable suggestions based on the data. Focus on operational improvements.

Respond with valid JSON:
{
  "overview": "...",
  "exceptions": "...",
  "achievements": "...",
  "recommendations": "...",
  "confidence": 0.0-1.0
}`;

interface BriefInputData {
  startDate?: string;
  endDate?: string;
}

async function handleExecutiveBrief(
  input: AgentInput,
  context: AgentContext
): Promise<AgentOutput> {
  const { startDate, endDate } = input.data as BriefInputData;

  const now = new Date();
  const resolvedEnd = endDate ?? now.toISOString().split('T')[0];
  const resolvedStart =
    startDate ??
    new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const startISO = `${resolvedStart}T00:00:00.000Z`;
  const endISO = `${resolvedEnd}T23:59:59.999Z`;

  const supabase = createServiceClient();

  // Gather data for the period
  const [
    casesCreatedRes,
    casesClosedRes,
    holdCasesRes,
    agentLogsRes,
    invoicesRes,
    workflowEventsRes,
  ] = await Promise.all([
    supabase
      .from('entry_cases')
      .select('id, case_number, status, priority, mode_of_transport')
      .eq('tenant_id', context.tenantId)
      .gte('created_at', startISO)
      .lte('created_at', endISO),
    supabase
      .from('entry_cases')
      .select('id, case_number')
      .eq('tenant_id', context.tenantId)
      .eq('status', 'closed')
      .gte('updated_at', startISO)
      .lte('updated_at', endISO),
    supabase
      .from('entry_cases')
      .select('id, case_number, priority')
      .eq('tenant_id', context.tenantId)
      .eq('status', 'hold'),
    supabase
      .from('ai_action_logs')
      .select('agent_type, confidence, human_decision, action')
      .eq('tenant_id', context.tenantId)
      .gte('created_at', startISO)
      .lte('created_at', endISO),
    supabase
      .from('invoices')
      .select('id, total, status')
      .eq('tenant_id', context.tenantId)
      .gte('created_at', startISO)
      .lte('created_at', endISO),
    supabase
      .from('workflow_events')
      .select('from_status, to_status')
      .eq('tenant_id', context.tenantId)
      .gte('created_at', startISO)
      .lte('created_at', endISO),
  ]);

  const casesCreated = casesCreatedRes.data ?? [];
  const casesClosed = casesClosedRes.data ?? [];
  const holdCases = holdCasesRes.data ?? [];
  const agentLogs = agentLogsRes.data ?? [];
  const invoicesData = invoicesRes.data ?? [];
  const workflowEvents = workflowEventsRes.data ?? [];

  // Summarize agent activity
  const agentSummary: Record<
    string,
    { count: number; accepted: number; rejected: number }
  > = {};
  for (const log of agentLogs) {
    if (!agentSummary[log.agent_type]) {
      agentSummary[log.agent_type] = { count: 0, accepted: 0, rejected: 0 };
    }
    agentSummary[log.agent_type].count++;
    if (log.human_decision === 'accepted') agentSummary[log.agent_type].accepted++;
    if (log.human_decision === 'rejected') agentSummary[log.agent_type].rejected++;
  }

  // Financial summary
  let invoicedTotal = 0;
  let paidTotal = 0;
  for (const inv of invoicesData) {
    invoicedTotal += inv.total;
    if (inv.status === 'paid') paidTotal += inv.total;
  }

  const userPrompt = buildBriefPrompt({
    startDate: resolvedStart,
    endDate: resolvedEnd,
    casesCreated,
    casesClosed,
    holdCases,
    agentSummary,
    invoicedTotal,
    paidTotal,
    invoiceCount: invoicesData.length,
    workflowTransitions: workflowEvents.length,
    totalAgentInvocations: agentLogs.length,
  });

  try {
    const llmResponse = await callClaude({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
      temperature: 0.2,
      maxTokens: 2048,
    });

    const parsed = JSON.parse(llmResponse.content) as {
      overview: string;
      exceptions: string;
      achievements: string;
      recommendations: string;
      confidence: number;
    };

    return {
      success: true,
      result: {
        brief: {
          overview: parsed.overview,
          exceptions: parsed.exceptions,
          achievements: parsed.achievements,
          recommendations: parsed.recommendations,
        },
        dateRange: { start: resolvedStart, end: resolvedEnd },
      },
      confidence: parsed.confidence ?? 0.8,
      citations: [],
      tokensUsed: llmResponse.usage,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      result: { error: errorMessage },
      confidence: 0,
      citations: [],
      error: errorMessage,
    };
  }
}

interface BriefPromptData {
  startDate: string;
  endDate: string;
  casesCreated: { id: string; case_number: string; status: string; priority: string; mode_of_transport: string }[];
  casesClosed: { id: string; case_number: string }[];
  holdCases: { id: string; case_number: string; priority: string }[];
  agentSummary: Record<string, { count: number; accepted: number; rejected: number }>;
  invoicedTotal: number;
  paidTotal: number;
  invoiceCount: number;
  workflowTransitions: number;
  totalAgentInvocations: number;
}

function buildBriefPrompt(data: BriefPromptData): string {
  let prompt = `Generate an executive brief for the period ${data.startDate} to ${data.endDate}.\n\n`;

  prompt += `## Case Activity\n`;
  prompt += `- Cases created: ${data.casesCreated.length}\n`;
  prompt += `- Cases closed: ${data.casesClosed.length}\n`;
  prompt += `- Cases on hold: ${data.holdCases.length}\n`;
  prompt += `- Workflow transitions: ${data.workflowTransitions}\n\n`;

  if (data.casesCreated.length > 0) {
    const statusBreakdown: Record<string, number> = {};
    const modeBreakdown: Record<string, number> = {};
    for (const c of data.casesCreated) {
      statusBreakdown[c.status] = (statusBreakdown[c.status] ?? 0) + 1;
      modeBreakdown[c.mode_of_transport] = (modeBreakdown[c.mode_of_transport] ?? 0) + 1;
    }
    prompt += `New cases by status: ${JSON.stringify(statusBreakdown)}\n`;
    prompt += `New cases by mode: ${JSON.stringify(modeBreakdown)}\n\n`;
  }

  if (data.holdCases.length > 0) {
    prompt += `Cases on hold:\n`;
    for (const c of data.holdCases) {
      prompt += `- ${c.case_number} (priority: ${c.priority})\n`;
    }
    prompt += `\n`;
  }

  prompt += `## Agent Activity\n`;
  prompt += `- Total agent invocations: ${data.totalAgentInvocations}\n`;
  for (const [agentType, stats] of Object.entries(data.agentSummary)) {
    prompt += `- ${agentType}: ${stats.count} invocations, ${stats.accepted} accepted, ${stats.rejected} rejected\n`;
  }
  prompt += `\n`;

  prompt += `## Financial Activity\n`;
  prompt += `- Invoices created: ${data.invoiceCount}\n`;
  prompt += `- Total invoiced: $${data.invoicedTotal.toFixed(2)}\n`;
  prompt += `- Total paid: $${data.paidTotal.toFixed(2)}\n`;

  return prompt;
}

export function registerExecutiveBriefAgent(): void {
  registerAgent({
    id: 'executive-brief',
    name: 'Executive Brief Agent',
    description:
      'Generates daily executive summaries analyzing operational activity, exceptions, achievements, and recommendations.',
    type: 'executive-brief',
    autonomyLevel: 'L0',
    tools: ['query_cases', 'query_agent_logs', 'query_invoices'],
    confidenceThreshold: 0.7,
    handler: handleExecutiveBrief,
  });
}
