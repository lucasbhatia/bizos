import { getCurrentUser, createServiceClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { CaseStatus } from "@/lib/types/database";
import { STATUS_COLORS, PRIORITY_COLORS } from "@/lib/types/database";
import { STATUS_COLOR_MAP } from "@/lib/design/tokens";
import { OpsCheckButton } from "./ops-check-button";
import { AgentActivityFeed } from "./agent-activity-feed";
import {
  Briefcase,
  CalendarClock,
  FileWarning,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  User,
} from "lucide-react";

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

const METRIC_CONFIG = [
  {
    label: "Active Cases",
    icon: Briefcase,
    borderColor: "border-l-blue-500",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  {
    label: "Due Today",
    icon: CalendarClock,
    borderColor: "border-l-amber-500",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
  },
  {
    label: "Missing Docs",
    icon: FileWarning,
    borderColor: "border-l-orange-500",
    iconBg: "bg-orange-100",
    iconColor: "text-orange-600",
  },
  {
    label: "Overdue Tasks",
    icon: AlertTriangle,
    borderColor: "border-l-red-500",
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
  },
] as const;

const STATUS_ORDER: CaseStatus[] = [
  "intake",
  "awaiting_docs",
  "docs_validated",
  "classification_review",
  "entry_prep",
  "submitted",
  "govt_review",
  "hold",
  "released",
  "billing",
];

const STAGE_BAR_COLORS: Record<string, string> = {
  intake: "bg-amber-500",
  awaiting_docs: "bg-amber-400",
  docs_validated: "bg-blue-500",
  classification_review: "bg-blue-400",
  entry_prep: "bg-blue-600",
  submitted: "bg-purple-500",
  govt_review: "bg-purple-400",
  hold: "bg-red-500",
  released: "bg-green-500",
  billing: "bg-green-400",
};

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = createServiceClient();

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
        .lt(
          "eta",
          new Date(Date.now() + 86400000).toISOString().split("T")[0]
        ),
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

  const metricValues = [
    activeCasesRes.count ?? 0,
    dueTodayRes.count ?? 0,
    awaitingDocsRes.count ?? 0,
    overdueTasksRes.count ?? 0,
  ];

  // Exception stack: urgent cases, overdue tasks, stuck cases
  const { data: exceptions } = await supabase
    .from("entry_cases")
    .select(
      "id, case_number, status, priority, updated_at, assigned_user_id, client_account:client_accounts(name), assigned_user:users(full_name)"
    )
    .or("priority.eq.urgent,status.eq.hold")
    .not("status", "in", '("closed","archived")')
    .order("priority", { ascending: false })
    .limit(10);

  const { data: overdueTasks } = await supabase
    .from("tasks")
    .select(
      "id, title, due_at, priority, entry_case_id, assigned_user:users(full_name), entry_case:entry_cases(case_number)"
    )
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
      statusCounts[c.status as CaseStatus] =
        (statusCounts[c.status as CaseStatus] ?? 0) + 1;
    }
  }

  const maxStatusCount = Math.max(
    ...STATUS_ORDER.map((s) => statusCounts[s] ?? 0),
    1
  );

  // Recent AI action logs
  const { data: aiActions } = await supabase
    .from("ai_action_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  const totalExceptions =
    (exceptions?.length ?? 0) + (overdueTasks?.length ?? 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">
          Welcome back, {user?.full_name}
        </p>
      </div>

      {/* Top Metrics Bar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {METRIC_CONFIG.map((metric, i) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.label}
              className={`rounded-xl border-l-4 ${metric.borderColor} bg-white p-5 shadow-sm`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${metric.iconBg}`}
                >
                  <Icon className={`h-5 w-5 ${metric.iconColor}`} />
                </div>
                <div>
                  <p className="text-3xl font-bold text-slate-900">
                    {metricValues[i]}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {metric.label}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Exception Stack (left 2/3) */}
        <div className="lg:col-span-2">
          <div className="rounded-xl bg-white shadow-sm">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-slate-900">
                  Needs Your Attention
                </h2>
                {totalExceptions > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {totalExceptions}
                  </Badge>
                )}
              </div>
            </div>
            <div className="divide-y px-2 py-2">
              {totalExceptions === 0 ? (
                <div className="flex items-center gap-3 px-4 py-8 justify-center">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                  <p className="text-sm font-medium text-green-700">
                    All clear — no exceptions
                  </p>
                </div>
              ) : (
                <>
                  {exceptions?.map((exc) => {
                    const clientName = Array.isArray(exc.client_account)
                      ? exc.client_account[0]?.name
                      : (exc.client_account as { name: string } | null)?.name;
                    const assigneeName = Array.isArray(exc.assigned_user)
                      ? exc.assigned_user[0]?.full_name
                      : (exc.assigned_user as { full_name: string } | null)
                          ?.full_name;
                    const isOverdue = exc.status === "hold";
                    const stripeColor = isOverdue
                      ? "border-l-red-500"
                      : "border-l-amber-400";
                    return (
                      <div
                        key={exc.id}
                        className={`flex items-center gap-4 border-l-4 ${stripeColor} rounded-lg px-4 py-3 mx-2 my-1 transition-colors hover:bg-slate-50`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-semibold text-slate-900">
                              {exc.case_number}
                            </span>
                            <span className="font-medium text-sm text-slate-700">
                              {clientName ?? "Unknown client"}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatRelativeTime(exc.updated_at)}
                            </span>
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {assigneeName ?? "Unassigned"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            className={
                              STATUS_COLORS[exc.status as CaseStatus] ?? ""
                            }
                            variant="secondary"
                          >
                            {formatStatus(exc.status)}
                          </Badge>
                          <Badge
                            className={
                              PRIORITY_COLORS[
                                exc.priority as keyof typeof PRIORITY_COLORS
                              ] ?? ""
                            }
                            variant="secondary"
                          >
                            {exc.priority}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Link href={`/cases/${exc.id}`}>
                              <ExternalLink className="mr-1 h-3 w-3" />
                              View
                            </Link>
                          </Button>
                        </div>
                      </div>
                    );
                  })}

                  {overdueTasks && overdueTasks.length > 0 && (
                    <>
                      <div className="px-6 pt-3 pb-1">
                        <p className="text-xs font-semibold uppercase tracking-wider text-red-600">
                          Overdue Tasks
                        </p>
                      </div>
                      {overdueTasks.map((task) => {
                        const assigneeName = Array.isArray(task.assigned_user)
                          ? task.assigned_user[0]?.full_name
                          : (
                              task.assigned_user as {
                                full_name: string;
                              } | null
                            )?.full_name;
                        const caseNumber = Array.isArray(task.entry_case)
                          ? task.entry_case[0]?.case_number
                          : (
                              task.entry_case as {
                                case_number: string;
                              } | null
                            )?.case_number;
                        return (
                          <div
                            key={task.id}
                            className="flex items-center gap-4 border-l-4 border-l-red-500 rounded-lg px-4 py-3 mx-2 my-1 transition-colors hover:bg-red-50/50"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900">
                                {task.title}
                              </p>
                              <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                                {caseNumber && (
                                  <span className="font-mono">
                                    {caseNumber}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {assigneeName ?? "Unassigned"}
                                </span>
                              </div>
                            </div>
                            <Badge variant="destructive" className="text-xs">
                              Overdue{" "}
                              {task.due_at
                                ? formatRelativeTime(task.due_at)
                                : ""}
                            </Badge>
                          </div>
                        );
                      })}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Cases by Stage (right 1/3) */}
        <div className="rounded-xl bg-white shadow-sm">
          <div className="border-b px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Cases by Stage
            </h2>
          </div>
          <div className="px-6 py-4 space-y-3">
            {STATUS_ORDER.map((status) => {
              const count = statusCounts[status] ?? 0;
              const widthPercent = Math.max(
                (count / maxStatusCount) * 100,
                count > 0 ? 8 : 0
              );
              const barColor =
                STAGE_BAR_COLORS[status] ?? "bg-slate-400";
              const token = STATUS_COLOR_MAP[status];
              return (
                <Link
                  key={status}
                  href={`/cases?status=${status}`}
                  className="group block"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">
                      {formatStatus(status)}
                    </span>
                    <span
                      className={`text-sm font-semibold ${
                        count > 0 ? token.text : "text-slate-400"
                      }`}
                    >
                      {count}
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    {count > 0 && (
                      <div
                        className={`h-full rounded-full ${barColor} transition-all group-hover:opacity-80`}
                        style={{ width: `${widthPercent}%` }}
                      />
                    )}
                  </div>
                </Link>
              );
            })}
            {Object.keys(statusCounts).length === 0 && (
              <p className="text-sm text-slate-500 py-4 text-center">
                No active cases
              </p>
            )}
          </div>
        </div>
      </div>

      {/* AI Ops Check */}
      <OpsCheckButton userRole={user?.role ?? "viewer"} />

      {/* Agent Activity Feed */}
      <AgentActivityFeed actions={aiActions ?? []} />
    </div>
  );
}
