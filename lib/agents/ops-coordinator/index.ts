import { registerAgent } from '@/lib/agents/registry';
import { createServiceClient } from '@/lib/supabase/server';
import type { AgentInput, AgentContext, AgentOutput } from '@/lib/types/agents';
import type { CaseStatus } from '@/lib/types/database';

// SLA thresholds per status (in hours)
const SLA_THRESHOLDS: Partial<Record<CaseStatus, number>> = {
  intake: 2,
  awaiting_docs: 24,
  docs_validated: 4,
  classification_review: 8,
  entry_prep: 4,
  govt_review: 48,
  hold: 24,
  released: 4,
  billing: 24,
};

interface StuckCase {
  id: string;
  case_number: string;
  status: CaseStatus;
  client_name: string;
  assigned_user_id: string | null;
  assigned_user_name: string | null;
  hours_stuck: number;
  sla_hours: number;
  severity: 'warning' | 'escalation';
}

interface OverdueTask {
  id: string;
  title: string;
  assigned_user_id: string | null;
  assigned_user_name: string | null;
  case_number: string | null;
  hours_overdue: number;
  severity: 'warning' | 'escalation';
}

interface MissingDocsCase {
  id: string;
  case_number: string;
  client_name: string;
  hours_in_status: number;
  hours_since_last_upload: number | null;
}

async function handleOpsCoordinator(input: AgentInput, context: AgentContext): Promise<AgentOutput> {
  const supabase = createServiceClient();
  const now = new Date();

  // 1. Detect stuck cases
  const { data: activeCases } = await supabase
    .from('entry_cases')
    .select('id, case_number, status, updated_at, assigned_user_id, client_account:client_accounts(name), assigned_user:users(id, full_name)')
    .eq('tenant_id', context.tenantId)
    .not('status', 'in', '("closed","archived")')
    .order('updated_at', { ascending: true });

  const stuckCases: StuckCase[] = [];
  for (const c of activeCases ?? []) {
    const status = c.status as CaseStatus;
    const slaHours = SLA_THRESHOLDS[status];
    if (!slaHours) continue;

    const updatedAt = new Date(c.updated_at);
    const hoursStuck = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);

    if (hoursStuck > slaHours) {
      const client = Array.isArray(c.client_account) ? c.client_account[0] : c.client_account;
      const assignee = Array.isArray(c.assigned_user) ? c.assigned_user[0] : c.assigned_user;
      stuckCases.push({
        id: c.id,
        case_number: c.case_number,
        status,
        client_name: (client as { name: string } | null)?.name ?? 'Unknown',
        assigned_user_id: c.assigned_user_id,
        assigned_user_name: (assignee as { full_name: string } | null)?.full_name ?? null,
        hours_stuck: Math.round(hoursStuck * 10) / 10,
        sla_hours: slaHours,
        severity: hoursStuck >= slaHours * 2 ? 'escalation' : 'warning',
      });
    }
  }

  // 2. Detect overdue tasks
  const { data: overdueTasks } = await supabase
    .from('tasks')
    .select('id, title, assigned_user_id, due_at, assigned_user:users(full_name), entry_case:entry_cases(case_number)')
    .eq('tenant_id', context.tenantId)
    .in('status', ['pending', 'in_progress'])
    .lt('due_at', now.toISOString());

  const overdueTaskItems: OverdueTask[] = (overdueTasks ?? []).map((t) => {
    const hoursOverdue = (now.getTime() - new Date(t.due_at).getTime()) / (1000 * 60 * 60);
    const assignee = Array.isArray(t.assigned_user) ? t.assigned_user[0] : t.assigned_user;
    const entryCase = Array.isArray(t.entry_case) ? t.entry_case[0] : t.entry_case;
    return {
      id: t.id,
      title: t.title,
      assigned_user_id: t.assigned_user_id,
      assigned_user_name: (assignee as { full_name: string } | null)?.full_name ?? null,
      case_number: (entryCase as { case_number: string } | null)?.case_number ?? null,
      hours_overdue: Math.round(hoursOverdue * 10) / 10,
      severity: hoursOverdue >= 24 ? 'escalation' as const : 'warning' as const,
    };
  });

  // 3. Detect missing documents (cases in awaiting_docs > 24h with no recent uploads)
  const missingDocsCases: MissingDocsCase[] = [];
  const awaitingDocsCases = (activeCases ?? []).filter((c) => c.status === 'awaiting_docs');

  for (const c of awaitingDocsCases) {
    const hoursInStatus = (now.getTime() - new Date(c.updated_at).getTime()) / (1000 * 60 * 60);
    if (hoursInStatus < 24) continue;

    const { data: recentDocs } = await supabase
      .from('documents')
      .select('created_at')
      .eq('entry_case_id', c.id)
      .order('created_at', { ascending: false })
      .limit(1);

    const lastUpload = recentDocs?.[0]?.created_at;
    const hoursSinceUpload = lastUpload
      ? (now.getTime() - new Date(lastUpload).getTime()) / (1000 * 60 * 60)
      : null;

    if (!lastUpload || (hoursSinceUpload && hoursSinceUpload > 12)) {
      const client = Array.isArray(c.client_account) ? c.client_account[0] : c.client_account;
      missingDocsCases.push({
        id: c.id,
        case_number: c.case_number,
        client_name: (client as { name: string } | null)?.name ?? 'Unknown',
        hours_in_status: Math.round(hoursInStatus * 10) / 10,
        hours_since_last_upload: hoursSinceUpload ? Math.round(hoursSinceUpload * 10) / 10 : null,
      });
    }
  }

  // 4. Take actions — create tasks (idempotent: check for existing open tasks first)
  let tasksCreated = 0;

  // Find ops_manager for escalations
  const { data: opsManagers } = await supabase
    .from('users')
    .select('id')
    .eq('tenant_id', context.tenantId)
    .eq('role', 'ops_manager')
    .eq('is_active', true)
    .limit(1);

  const opsManagerId = opsManagers?.[0]?.id ?? null;

  for (const sc of stuckCases) {
    // Check if there's already an open ops-coordinator task for this case
    const { count } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('entry_case_id', sc.id)
      .eq('tenant_id', context.tenantId)
      .in('status', ['pending', 'in_progress'])
      .like('title', '%[Ops Agent]%');

    if ((count ?? 0) > 0) continue; // Idempotent: skip if task already exists

    const assigneeId = sc.severity === 'escalation' ? opsManagerId : sc.assigned_user_id;
    const title = sc.severity === 'escalation'
      ? `[Ops Agent] ESCALATION: Case ${sc.case_number} stuck ${sc.hours_stuck}h (${sc.status})`
      : `[Ops Agent] Case ${sc.case_number} stuck ${sc.hours_stuck}h in ${sc.status}`;

    await supabase.from('tasks').insert({
      tenant_id: context.tenantId,
      entry_case_id: sc.id,
      assigned_user_id: assigneeId,
      title,
      description: `SLA threshold: ${sc.sla_hours}h. Currently stuck for ${sc.hours_stuck}h.\nClient: ${sc.client_name}`,
      task_type: sc.severity === 'escalation' ? 'escalation' : 'review',
      status: 'pending',
      priority: sc.severity === 'escalation' ? 'urgent' : 'high',
      due_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    });
    tasksCreated++;
  }

  for (const ot of overdueTaskItems) {
    if (ot.severity === 'escalation') {
      // Check for existing escalation
      const { count } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', context.tenantId)
        .in('status', ['pending', 'in_progress'])
        .like('title', `%[Ops Agent] Overdue task escalation: ${ot.id}%`);

      if ((count ?? 0) > 0) continue;

      await supabase.from('tasks').insert({
        tenant_id: context.tenantId,
        assigned_user_id: opsManagerId,
        title: `[Ops Agent] Overdue task escalation: ${ot.id}`,
        description: `Task "${ot.title}" is ${ot.hours_overdue}h overdue.\nAssigned to: ${ot.assigned_user_name ?? 'unassigned'}\nCase: ${ot.case_number ?? 'N/A'}`,
        task_type: 'escalation',
        status: 'pending',
        priority: 'urgent',
        due_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      });
      tasksCreated++;
    } else {
      // Bump priority to high
      await supabase
        .from('tasks')
        .update({ priority: 'high' })
        .eq('id', ot.id)
        .neq('priority', 'urgent'); // Don't downgrade urgent
    }
  }

  // 5. Generate daily digest summary
  const digest = {
    run_at: now.toISOString(),
    total_active_cases: (activeCases ?? []).length,
    stuck_cases: stuckCases.length,
    escalations: stuckCases.filter((sc) => sc.severity === 'escalation').length,
    overdue_tasks: overdueTaskItems.length,
    missing_docs_cases: missingDocsCases.length,
    tasks_created: tasksCreated,
    cases_by_status: groupBy(activeCases ?? [], 'status'),
  };

  // Log audit event
  await supabase.from('audit_events').insert({
    tenant_id: context.tenantId,
    event_type: 'ops_coordinator.run',
    entity_type: 'system',
    entity_id: context.tenantId,
    actor_type: 'agent',
    actor_id: 'ops-coordinator',
    action: `Ops check: ${stuckCases.length} stuck, ${overdueTaskItems.length} overdue, ${tasksCreated} tasks created`,
    details: digest,
  });

  return {
    success: true,
    result: {
      stuck_cases: stuckCases,
      overdue_tasks: overdueTaskItems,
      missing_docs_cases: missingDocsCases,
      digest,
    },
    confidence: 1.0,
    citations: [],
  };
}

function groupBy<T extends Record<string, unknown>>(items: T[], key: string): Record<string, number> {
  const groups: Record<string, number> = {};
  for (const item of items) {
    const val = String(item[key] ?? 'unknown');
    groups[val] = (groups[val] ?? 0) + 1;
  }
  return groups;
}

export function registerOpsCoordinatorAgent(): void {
  registerAgent({
    id: 'ops-coordinator',
    name: 'Ops Coordinator',
    description: 'Monitors SLAs, detects stuck cases and overdue tasks, creates escalation tasks. Runs on schedule.',
    type: 'ops',
    autonomyLevel: 'L1',
    tools: ['query_cases', 'query_tasks', 'create_task', 'update_task'],
    confidenceThreshold: 0.5,
    handler: handleOpsCoordinator,
  });
}
