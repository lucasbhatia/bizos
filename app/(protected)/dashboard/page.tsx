import { getCurrentUser, createServiceClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import dynamic from "next/dynamic";
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
  TrendingUp,
  Activity,
  Bot,
} from "lucide-react";

// Dynamic imports for Recharts components (no SSR)
const StatusBarChart = dynamic(
  () => import("./charts").then((mod) => mod.StatusBarChart),
  { ssr: false }
);
const WeeklyAreaChart = dynamic(
  () => import("./charts").then((mod) => mod.WeeklyAreaChart),
  { ssr: false }
);
const AgentPieChart = dynamic(
  () => import("./charts").then((mod) => mod.AgentPieChart),
  { ssr: false }
);
const MiniSparkline = dynamic(
  () => import("./charts").then((mod) => mod.MiniSparkline),
  { ssr: false }
);

// Import the data helper (not a component, fine to import normally)
import { prepareStatusData } from "./charts";

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

function formatStuckTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = (diffMs / 3600000).toFixed(1);
  const diffDays = Math.floor(parseFloat(diffHours) / 24);

  if (diffDays > 0) return `Stuck ${diffDays}d`;
  return `Stuck ${diffHours}h`;
}

function formatStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Generate fake sparkline data for visual effect
function generateSparkline(seed: number): { value: number }[] {
  const points: { value: number }[] = [];
  let v = seed;
  for (let i = 0; i < 7; i++) {
    v = Math.max(1, v + Math.floor((Math.sin(seed * 3 + i * 1.7) * 4)));
    points.push({ value: v });
  }
  return points;
}

const METRIC_CONFIG = [
  {
    label: "Active Cases",
    subtitle: "In pipeline",
    icon: Briefcase,
    borderColor: "border-l-blue-500",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    iconRing: "ring-blue-100",
    sparkColor: "#3b82f6",
  },
  {
    label: "Due Today",
    subtitle: "ETA arrivals",
    icon: CalendarClock,
    borderColor: "border-l-amber-500",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    iconRing: "ring-amber-100",
    sparkColor: "#f59e0b",
  },
  {
    label: "Missing Docs",
    subtitle: "Awaiting upload",
    icon: FileWarning,
    borderColor: "border-l-orange-500",
    iconBg: "bg-orange-50",
    iconColor: "text-orange-600",
    iconRing: "ring-orange-100",
    sparkColor: "#ea580c",
  },
  {
    label: "Overdue Tasks",
    subtitle: "Past deadline",
    icon: AlertTriangle,
    borderColor: "border-l-red-500",
    iconBg: "bg-red-50",
    iconColor: "text-red-600",
    iconRing: "ring-red-100",
    sparkColor: "#ef4444",
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

  const totalCasesInPipeline = STATUS_ORDER.reduce(
    (sum, s) => sum + (statusCounts[s] ?? 0),
    0
  );

  // Prepare status bar chart data
  const statusBarData = prepareStatusData(
    statusCounts as Record<string, number>,
    STATUS_ORDER
  );

  // Cases this week — count cases created per day for last 7 days
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 6);
  weekAgo.setHours(0, 0, 0, 0);

  const { data: weeklyCases } = await supabase
    .from("entry_cases")
    .select("created_at")
    .gte("created_at", weekAgo.toISOString());

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weeklyData: { day: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const count = weeklyCases?.filter(
      (c) => c.created_at.split("T")[0] === dateStr
    ).length ?? 0;
    weeklyData.push({ day: dayNames[d.getDay()], count });
  }

  // Recent AI action logs
  const { data: aiActions } = await supabase
    .from("ai_action_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  // Aggregate agent invocations by type for pie chart
  const agentCounts: Record<string, number> = {};
  if (aiActions) {
    for (const a of aiActions) {
      const name = a.agent_type
        .replace(/_/g, " ")
        .replace(/\b\w/g, (l: string) => l.toUpperCase());
      agentCounts[name] = (agentCounts[name] ?? 0) + 1;
    }
  }
  const agentPieData = Object.entries(agentCounts).map(([name, value]) => ({
    name,
    value,
  }));

  const totalExceptions =
    (exceptions?.length ?? 0) + (overdueTasks?.length ?? 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Welcome back, {user?.full_name}
          </p>
        </div>
        <div className="hidden items-center gap-2 text-xs text-slate-400 sm:flex">
          <Activity className="h-3.5 w-3.5" />
          <span>
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
      </div>

      {/* Top Metrics Bar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {METRIC_CONFIG.map((metric, i) => {
          const Icon = metric.icon;
          const value = metricValues[i];
          const isAlert = i >= 2 && value > 0;
          const sparkData = generateSparkline(value + i * 3 + 5);
          return (
            <div
              key={metric.label}
              className={`group relative overflow-hidden rounded-xl border-l-4 ${metric.borderColor} bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md`}
            >
              {/* Subtle gradient overlay */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white via-white to-slate-50/80" />

              <div className="relative flex items-center gap-4">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${metric.iconBg} ring-4 ${metric.iconRing}`}
                >
                  <Icon className={`h-5 w-5 ${metric.iconColor}`} />
                </div>
                <div className="flex-1">
                  <p
                    className={`text-3xl font-bold tracking-tight ${
                      isAlert ? "text-red-600" : "text-slate-900"
                    }`}
                  >
                    {value}
                  </p>
                  <p className="text-xs font-medium text-slate-500">
                    {metric.label}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {metric.subtitle}
                  </p>
                </div>
              </div>
              {/* Mini sparkline */}
              <div className="relative mt-3">
                <MiniSparkline data={sparkData} color={metric.sparkColor} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Exception Stack (left 2/3) */}
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-xl bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </div>
                <h2 className="text-base font-semibold text-slate-900">
                  Needs Your Attention
                </h2>
                {totalExceptions > 0 && (
                  <Badge
                    variant="destructive"
                    className="h-5 min-w-[20px] rounded-full px-1.5 text-[11px] font-bold"
                  >
                    {totalExceptions}
                  </Badge>
                )}
              </div>
            </div>
            <div className="divide-y divide-slate-50 p-3">
              {totalExceptions === 0 ? (
                <div className="flex items-center justify-center gap-3 px-4 py-10">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50 ring-4 ring-green-50/50">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-green-700">
                      All clear
                    </p>
                    <p className="text-xs text-green-600/70">
                      No exceptions require attention
                    </p>
                  </div>
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
                    const isHold = exc.status === "hold";
                    const stripeColor = isHold
                      ? "border-l-red-500"
                      : "border-l-amber-400";
                    return (
                      <div
                        key={exc.id}
                        className={`group flex items-center gap-4 border-l-4 ${stripeColor} mx-1 my-1 rounded-lg px-4 py-3 transition-all duration-150 hover:bg-slate-50/80 hover:shadow-sm`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2.5">
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-bold text-slate-700">
                              {exc.case_number}
                            </span>
                            <span className="text-sm font-semibold text-slate-900">
                              {clientName ?? "Unknown client"}
                            </span>
                          </div>
                          <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1 font-medium text-orange-600">
                              <Clock className="h-3 w-3" />
                              {formatStuckTime(exc.updated_at)}
                            </span>
                            {assigneeName && (
                              <span className="flex items-center gap-1.5">
                                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 text-[9px] font-bold text-slate-600">
                                  {getInitials(assigneeName)}
                                </span>
                                {assigneeName}
                              </span>
                            )}
                            {!assigneeName && (
                              <span className="italic text-slate-400">
                                Unassigned
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
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
                            className="h-8 gap-1 text-xs text-blue-600 opacity-0 transition-opacity duration-150 group-hover:opacity-100 hover:text-blue-800"
                          >
                            <Link href={`/cases/${exc.id}`}>
                              <ExternalLink className="h-3 w-3" />
                              View
                            </Link>
                          </Button>
                        </div>
                      </div>
                    );
                  })}

                  {overdueTasks && overdueTasks.length > 0 && (
                    <>
                      <div className="px-6 pb-1 pt-4">
                        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-red-500">
                          <span className="h-px flex-1 bg-red-100" />
                          Overdue Tasks
                          <span className="h-px flex-1 bg-red-100" />
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
                            className="group mx-1 my-1 flex items-center gap-4 rounded-lg border-l-4 border-l-red-500 px-4 py-3 transition-all duration-150 hover:bg-red-50/40 hover:shadow-sm"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-slate-900">
                                {task.title}
                              </p>
                              <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                                {caseNumber && (
                                  <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-medium text-slate-600">
                                    {caseNumber}
                                  </span>
                                )}
                                {assigneeName && (
                                  <span className="flex items-center gap-1.5">
                                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 text-[9px] font-bold text-slate-600">
                                      {getInitials(assigneeName)}
                                    </span>
                                    {assigneeName}
                                  </span>
                                )}
                                {!assigneeName && (
                                  <span className="italic text-slate-400">
                                    Unassigned
                                  </span>
                                )}
                              </div>
                            </div>
                            <Badge
                              variant="destructive"
                              className="shrink-0 text-xs font-semibold"
                            >
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

        {/* Cases by Stage (right 1/3) — now with real bar chart */}
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Cases by Stage
                </h2>
                <p className="text-[11px] text-slate-400">
                  {totalCasesInPipeline} total in pipeline
                </p>
              </div>
            </div>
          </div>
          <div className="px-4 py-4">
            <StatusBarChart data={statusBarData} />
          </div>
        </div>
      </div>

      {/* Second row: Weekly trend + Agent activity pie */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Cases This Week */}
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
              <Activity className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Cases This Week
              </h2>
              <p className="text-[11px] text-slate-400">
                New cases created over the last 7 days
              </p>
            </div>
          </div>
          <div className="px-4 py-4">
            <WeeklyAreaChart data={weeklyData} />
          </div>
        </div>

        {/* Agent Activity Pie */}
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50">
              <Bot className="h-4 w-4 text-purple-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Agent Activity
              </h2>
              <p className="text-[11px] text-slate-400">
                Invocations by agent type
              </p>
            </div>
          </div>
          <div className="px-4 py-4">
            <AgentPieChart data={agentPieData} />
            {/* Legend */}
            {agentPieData.length > 0 && (
              <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 px-4">
                {agentPieData.map((item, i) => {
                  const colors = ["#3b82f6", "#8b5cf6", "#14b8a6", "#f59e0b", "#ef4444", "#ec4899"];
                  return (
                    <div key={item.name} className="flex items-center gap-1.5 text-xs text-slate-600">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: colors[i % colors.length] }}
                      />
                      {item.name} ({item.value})
                    </div>
                  );
                })}
              </div>
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
