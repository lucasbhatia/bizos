import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import type { CaseStatus } from "@/lib/types/database";
import { STATUS_COLORS, PRIORITY_COLORS } from "@/lib/types/database";

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  return "just now";
}

function formatStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const supabase = createClient();

  // Stats queries
  const [activeCasesRes, dueTodayRes, awaitingDocsRes, overdueTasksRes] =
    await Promise.all([
      supabase
        .from("entry_cases")
        .select("id", { count: "exact", head: true })
        .not("status", "in", '("closed","archived")'),
      supabase
        .from("entry_cases")
        .select("id", { count: "exact", head: true })
        .gte("eta", new Date().toISOString().split("T")[0])
        .lt("eta", new Date(Date.now() + 86400000).toISOString().split("T")[0]),
      supabase
        .from("entry_cases")
        .select("id", { count: "exact", head: true })
        .eq("status", "awaiting_docs"),
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending")
        .lt("due_at", new Date().toISOString()),
    ]);

  const stats = [
    {
      label: "Active Cases",
      value: activeCasesRes.count ?? 0,
      color: (activeCasesRes.count ?? 0) > 15 ? "text-red-600" : "text-green-600",
    },
    {
      label: "Cases Due Today",
      value: dueTodayRes.count ?? 0,
      color: (dueTodayRes.count ?? 0) > 3 ? "text-yellow-600" : "text-green-600",
    },
    {
      label: "Missing Documents",
      value: awaitingDocsRes.count ?? 0,
      color: (awaitingDocsRes.count ?? 0) > 0 ? "text-yellow-600" : "text-green-600",
    },
    {
      label: "Overdue Tasks",
      value: overdueTasksRes.count ?? 0,
      color: (overdueTasksRes.count ?? 0) > 0 ? "text-red-600" : "text-green-600",
    },
  ];

  // Exception stack: urgent cases, overdue tasks, stuck cases
  const { data: exceptions } = await supabase
    .from("entry_cases")
    .select("id, case_number, status, priority, updated_at, assigned_user_id, client_account:client_accounts(name), assigned_user:users(full_name)")
    .or("priority.eq.urgent,status.eq.hold")
    .not("status", "in", '("closed","archived")')
    .order("priority", { ascending: false })
    .limit(10);

  const { data: overdueTasks } = await supabase
    .from("tasks")
    .select("id, title, due_at, priority, entry_case_id, assigned_user:users(full_name), entry_case:entry_cases(case_number)")
    .in("status", ["pending", "in_progress"])
    .lt("due_at", new Date().toISOString())
    .order("due_at", { ascending: true })
    .limit(5);

  // Cases by status
  const { data: allCases } = await supabase
    .from("entry_cases")
    .select("status")
    .not("status", "in", '("closed","archived")');

  const statusCounts: Partial<Record<CaseStatus, number>> = {};
  if (allCases) {
    for (const c of allCases) {
      statusCounts[c.status as CaseStatus] = (statusCounts[c.status as CaseStatus] ?? 0) + 1;
    }
  }

  const statusOrder: CaseStatus[] = [
    "intake", "awaiting_docs", "docs_validated", "classification_review",
    "entry_prep", "submitted", "govt_review", "hold", "released", "billing",
  ];

  // Recent activity
  const { data: recentActivity } = await supabase
    .from("audit_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">
          Welcome back, {user?.full_name}
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <p className={`text-3xl font-bold ${stat.color}`}>
                {stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Exception Stack (left 2/3) */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Needs Attention</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {exceptions && exceptions.length > 0 ? (
                exceptions.map((exc) => {
                  const clientName = Array.isArray(exc.client_account)
                    ? exc.client_account[0]?.name
                    : (exc.client_account as { name: string } | null)?.name;
                  const assigneeName = Array.isArray(exc.assigned_user)
                    ? exc.assigned_user[0]?.full_name
                    : (exc.assigned_user as { full_name: string } | null)?.full_name;
                  return (
                    <Link
                      key={exc.id}
                      href={`/cases/${exc.id}`}
                      className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-slate-50"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{exc.case_number}</span>
                          <Badge className={STATUS_COLORS[exc.status as CaseStatus] ?? ""} variant="secondary">
                            {formatStatus(exc.status)}
                          </Badge>
                          <Badge className={PRIORITY_COLORS[exc.priority as keyof typeof PRIORITY_COLORS] ?? ""} variant="secondary">
                            {exc.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                          {clientName ?? "Unknown client"} — {assigneeName ?? "Unassigned"}
                        </p>
                      </div>
                      <span className="text-xs text-slate-400">
                        {formatRelativeTime(exc.updated_at)}
                      </span>
                    </Link>
                  );
                })
              ) : (
                <p className="text-sm text-slate-500">No exceptions to review</p>
              )}

              {overdueTasks && overdueTasks.length > 0 && (
                <>
                  <div className="border-t pt-3 mt-3">
                    <p className="text-sm font-medium text-red-600 mb-2">Overdue Tasks</p>
                  </div>
                  {overdueTasks.map((task) => {
                    const assigneeName = Array.isArray(task.assigned_user)
                      ? task.assigned_user[0]?.full_name
                      : (task.assigned_user as { full_name: string } | null)?.full_name;
                    const caseNumber = Array.isArray(task.entry_case)
                      ? task.entry_case[0]?.case_number
                      : (task.entry_case as { case_number: string } | null)?.case_number;
                    return (
                      <div
                        key={task.id}
                        className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{task.title}</p>
                          <p className="text-xs text-slate-500">
                            {caseNumber ? `Case ${caseNumber} — ` : ""}
                            {assigneeName ?? "Unassigned"}
                          </p>
                        </div>
                        <Badge variant="destructive" className="text-xs">
                          Overdue {task.due_at ? formatRelativeTime(task.due_at) : ""}
                        </Badge>
                      </div>
                    );
                  })}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Cases by Status (right 1/3) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cases by Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {statusOrder.map((status) => {
              const count = statusCounts[status] ?? 0;
              if (count === 0) return null;
              return (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={STATUS_COLORS[status]} variant="secondary">
                      {formatStatus(status)}
                    </Badge>
                  </div>
                  <span className="text-sm font-semibold">{count}</span>
                </div>
              );
            })}
            {Object.keys(statusCounts).length === 0 && (
              <p className="text-sm text-slate-500">No active cases</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivity && recentActivity.length > 0 ? (
              recentActivity.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 border-b border-slate-100 pb-3 last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{event.action}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {event.actor_type === "agent" ? "AI" : event.actor_type}
                      </Badge>
                      <span className="text-xs text-slate-400">
                        {formatRelativeTime(event.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No recent activity</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
