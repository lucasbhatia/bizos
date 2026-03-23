import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, createServiceClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CaseStatus, UserRole } from "@/lib/types/database";
import { STATUS_COLORS } from "@/lib/types/database";
import { GenerateBriefButton } from "./generate-brief-button";
import {
  BarChart3,
  Briefcase,
  CalendarDays,
  Clock,
  TrendingUp,
  DollarSign,
  Bot,
  FileCheck,
  Ship,
  Plane,
  Truck,
  TrainFront,
} from "lucide-react";

const EXECUTIVE_ROLES: UserRole[] = ["admin", "ops_manager", "broker_lead"];

function formatStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDuration(ms: number): string {
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

const TRANSPORT_ICONS: Record<string, typeof Ship> = {
  ocean: Ship,
  air: Plane,
  truck: Truck,
  rail: TrainFront,
};

function BarChart({
  data,
  maxValue,
  colorClass,
}: {
  data: { label: string; value: number }[];
  maxValue: number;
  colorClass?: string;
}) {
  const safeMax = maxValue > 0 ? maxValue : 1;
  return (
    <div className="space-y-2">
      {data.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="w-32 text-xs text-slate-600 truncate text-right">
            {item.label}
          </span>
          <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${colorClass ?? "bg-blue-500"}`}
              style={{
                width: `${Math.max((item.value / safeMax) * 100, 2)}%`,
              }}
            />
          </div>
          <span className="w-8 text-xs font-semibold text-slate-700 text-right">
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export default async function ReportsPage() {
  const user = await getCurrentUser();
  if (!user || !EXECUTIVE_ROLES.includes(user.role)) {
    redirect("/dashboard");
  }

  const supabase = createServiceClient();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfWeek = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - now.getDay()
  ).toISOString();

  // ============================================================================
  // Portfolio Metrics
  // ============================================================================

  const [
    totalCasesRes,
    monthCasesRes,
    weekCasesRes,
    allCasesRes,
    clientCasesRes,
    modeCasesRes,
    closedCasesRes,
  ] = await Promise.all([
    supabase
      .from("entry_cases")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("entry_cases")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfMonth),
    supabase
      .from("entry_cases")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfWeek),
    supabase.from("entry_cases").select("status"),
    supabase
      .from("entry_cases")
      .select("client_account_id, client_account:client_accounts(name)"),
    supabase.from("entry_cases").select("mode_of_transport"),
    supabase
      .from("entry_cases")
      .select("created_at, updated_at, status")
      .eq("status", "closed"),
  ]);

  const totalCases = totalCasesRes.count ?? 0;
  const monthCases = monthCasesRes.count ?? 0;
  const weekCases = weekCasesRes.count ?? 0;

  // Cases by status distribution
  const statusCounts: Record<string, number> = {};
  if (allCasesRes.data) {
    for (const c of allCasesRes.data) {
      statusCounts[c.status] = (statusCounts[c.status] ?? 0) + 1;
    }
  }

  // Average lifecycle duration (intake to closed)
  let avgLifecycleMs = 0;
  if (closedCasesRes.data && closedCasesRes.data.length > 0) {
    const totalMs = closedCasesRes.data.reduce((sum, c) => {
      return sum + (new Date(c.updated_at).getTime() - new Date(c.created_at).getTime());
    }, 0);
    avgLifecycleMs = totalMs / closedCasesRes.data.length;
  }

  // Cases by client (top 5)
  const clientCounts: Record<string, { name: string; count: number }> = {};
  if (clientCasesRes.data) {
    for (const c of clientCasesRes.data) {
      const clientName = Array.isArray(c.client_account)
        ? c.client_account[0]?.name
        : (c.client_account as { name: string } | null)?.name;
      const key = c.client_account_id;
      if (!clientCounts[key]) {
        clientCounts[key] = { name: clientName ?? "Unknown", count: 0 };
      }
      clientCounts[key].count++;
    }
  }
  const topClients = Object.values(clientCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Cases by transport mode
  const modeCounts: Record<string, number> = {};
  if (modeCasesRes.data) {
    for (const c of modeCasesRes.data) {
      modeCounts[c.mode_of_transport] = (modeCounts[c.mode_of_transport] ?? 0) + 1;
    }
  }

  // ============================================================================
  // Trends -- Cases per week (last 8 weeks)
  // ============================================================================

  const eightWeeksAgo = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 56
  ).toISOString();

  const { data: recentCases } = await supabase
    .from("entry_cases")
    .select("created_at")
    .gte("created_at", eightWeeksAgo);

  const weekBuckets: { label: string; value: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - now.getDay() - i * 7
    );
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    const count =
      recentCases?.filter((c) => {
        const d = new Date(c.created_at);
        return d >= weekStart && d < weekEnd;
      }).length ?? 0;
    const label = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;
    weekBuckets.push({ label, value: count });
  }

  // Document parsing success rate
  const [parsedSuccessRes, parsedTotalRes] = await Promise.all([
    supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("parse_status", "completed"),
    supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .in("parse_status", ["completed", "failed"]),
  ]);
  const parseSuccessRate =
    (parsedTotalRes.count ?? 0) > 0
      ? Math.round(
          ((parsedSuccessRes.count ?? 0) / (parsedTotalRes.count ?? 1)) * 100
        )
      : 0;

  // ============================================================================
  // Agent Performance
  // ============================================================================

  const { data: agentLogs } = await supabase
    .from("ai_action_logs")
    .select("agent_type, confidence, human_decision");

  let totalInvocations = 0;
  let totalAccepted = 0;
  let totalDecisions = 0;
  let totalConfidence = 0;
  let confidenceCount = 0;

  const agentBreakdown: Record<
    string,
    {
      invocations: number;
      totalConfidence: number;
      confidenceCount: number;
      accepted: number;
      rejected: number;
    }
  > = {};

  if (agentLogs) {
    for (const log of agentLogs) {
      totalInvocations++;
      if (log.confidence !== null) {
        totalConfidence += log.confidence;
        confidenceCount++;
      }
      if (log.human_decision === "accepted") {
        totalAccepted++;
        totalDecisions++;
      } else if (log.human_decision === "rejected") {
        totalDecisions++;
      }

      if (!agentBreakdown[log.agent_type]) {
        agentBreakdown[log.agent_type] = {
          invocations: 0,
          totalConfidence: 0,
          confidenceCount: 0,
          accepted: 0,
          rejected: 0,
        };
      }
      const entry = agentBreakdown[log.agent_type];
      entry.invocations++;
      if (log.confidence !== null) {
        entry.totalConfidence += log.confidence;
        entry.confidenceCount++;
      }
      if (log.human_decision === "accepted") entry.accepted++;
      if (log.human_decision === "rejected") entry.rejected++;
    }
  }

  const avgConfidence =
    confidenceCount > 0 ? (totalConfidence / confidenceCount).toFixed(2) : "N/A";
  const acceptanceRate =
    totalDecisions > 0
      ? `${Math.round((totalAccepted / totalDecisions) * 100)}%`
      : "N/A";

  // ============================================================================
  // Financial Summary
  // ============================================================================

  const { data: invoices } = await supabase
    .from("invoices")
    .select("total, status");

  let totalInvoiced = 0;
  let totalPaid = 0;
  let totalOutstanding = 0;
  let invoiceCount = 0;

  if (invoices) {
    for (const inv of invoices) {
      totalInvoiced += inv.total;
      invoiceCount++;
      if (inv.status === "paid") {
        totalPaid += inv.total;
      } else if (inv.status === "sent" || inv.status === "overdue") {
        totalOutstanding += inv.total;
      }
    }
  }

  const avgInvoiceValue = invoiceCount > 0 ? totalInvoiced / invoiceCount : 0;

  // ============================================================================
  // Status distribution bar chart data
  // ============================================================================

  const allStatuses: CaseStatus[] = [
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
    "closed",
    "archived",
  ];

  const statusBarData = allStatuses
    .filter((s) => (statusCounts[s] ?? 0) > 0)
    .map((s) => ({
      label: formatStatus(s),
      value: statusCounts[s] ?? 0,
    }));

  const maxStatusCount = Math.max(...statusBarData.map((d) => d.value), 1);
  const maxWeeklyCount = Math.max(...weekBuckets.map((d) => d.value), 1);
  const maxClientCount = Math.max(...topClients.map((d) => d.count), 1);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
            <BarChart3 className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Executive Reports
            </h1>
            <p className="text-sm text-slate-500">
              Portfolio metrics, trends, and agent performance
            </p>
          </div>
        </div>
        <GenerateBriefButton userRole={user.role} />
      </div>

      {/* ================================================================== */}
      {/* Portfolio Metrics */}
      {/* ================================================================== */}

      <div>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Portfolio Metrics
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="rounded-xl bg-white shadow-sm border border-l-4 border-l-slate-400">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">Total Cases</p>
                <Briefcase className="h-4 w-4 text-slate-400" />
              </div>
              <p className="text-3xl font-bold text-slate-900 mt-1">{totalCases}</p>
              <p className="text-xs text-slate-400 mt-1">All time</p>
            </CardContent>
          </Card>
          <Card className="rounded-xl bg-white shadow-sm border border-l-4 border-l-blue-500">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">This Month</p>
                <CalendarDays className="h-4 w-4 text-blue-400" />
              </div>
              <p className="text-3xl font-bold text-blue-600 mt-1">{monthCases}</p>
            </CardContent>
          </Card>
          <Card className="rounded-xl bg-white shadow-sm border border-l-4 border-l-blue-500">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">This Week</p>
                <TrendingUp className="h-4 w-4 text-blue-400" />
              </div>
              <p className="text-3xl font-bold text-blue-600 mt-1">{weekCases}</p>
            </CardContent>
          </Card>
          <Card className="rounded-xl bg-white shadow-sm border border-l-4 border-l-violet-500">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">Avg Lifecycle</p>
                <Clock className="h-4 w-4 text-violet-400" />
              </div>
              <p className="text-3xl font-bold text-slate-900 mt-1">
                {avgLifecycleMs > 0 ? formatDuration(avgLifecycleMs) : "N/A"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Cases by Status */}
        <Card className="rounded-xl bg-white shadow-sm border">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-base font-semibold text-slate-800">
              Cases by Status
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            {statusBarData.length > 0 ? (
              <BarChart
                data={statusBarData}
                maxValue={maxStatusCount}
                colorClass="bg-blue-500"
              />
            ) : (
              <p className="text-sm text-slate-500">No cases yet</p>
            )}
          </CardContent>
        </Card>

        {/* Cases by Client (Top 5) */}
        <Card className="rounded-xl bg-white shadow-sm border">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-base font-semibold text-slate-800">Top 5 Clients</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            {topClients.length > 0 ? (
              <BarChart
                data={topClients.map((c) => ({
                  label: c.name,
                  value: c.count,
                }))}
                maxValue={maxClientCount}
                colorClass="bg-emerald-500"
              />
            ) : (
              <p className="text-sm text-slate-500">No client data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transport Mode Breakdown */}
      <Card className="rounded-xl bg-white shadow-sm border">
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-base font-semibold text-slate-800">
            Cases by Transport Mode
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <div className="flex flex-wrap gap-4">
            {Object.entries(modeCounts).map(([mode, count]) => {
              const ModeIcon = TRANSPORT_ICONS[mode] ?? Ship;
              return (
                <div
                  key={mode}
                  className="flex items-center gap-3 rounded-xl border bg-slate-50/50 p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100">
                    <ModeIcon className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 capitalize">{mode}</p>
                    <p className="text-lg font-bold text-slate-900">{count}</p>
                  </div>
                </div>
              );
            })}
            {Object.keys(modeCounts).length === 0 && (
              <p className="text-sm text-slate-500">No transport data</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ================================================================== */}
      {/* Trends */}
      {/* ================================================================== */}

      <div>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Trends</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="rounded-xl bg-white shadow-sm border">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-base font-semibold text-slate-800">
                Cases Per Week (Last 8 Weeks)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <BarChart
                data={weekBuckets}
                maxValue={maxWeeklyCount}
                colorClass="bg-indigo-500"
              />
            </CardContent>
          </Card>

          <Card className="rounded-xl bg-white shadow-sm border">
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-green-500" />
                <CardTitle className="text-base font-semibold text-slate-800">
                  Document Parsing Success
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="flex items-center gap-4">
                <div className="flex-1 h-8 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${parseSuccessRate}%` }}
                  />
                </div>
                <span className="text-2xl font-bold text-slate-900">
                  {parseSuccessRate}%
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {parsedSuccessRes.count ?? 0} successful /{" "}
                {parsedTotalRes.count ?? 0} total parsed
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ================================================================== */}
      {/* Agent Performance */}
      {/* ================================================================== */}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
            Agent Performance
          </h2>
          <Link href="/reports/agents">
            <Button variant="outline" size="sm" className="rounded-lg">
              View Detailed Metrics
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
          <Card className="rounded-xl bg-white shadow-sm border border-l-4 border-l-slate-400">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">Total Invocations</p>
                <Bot className="h-4 w-4 text-slate-400" />
              </div>
              <p className="text-3xl font-bold text-slate-900 mt-1">
                {totalInvocations}
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-xl bg-white shadow-sm border border-l-4 border-l-green-500">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">Acceptance Rate</p>
              </div>
              <p className="text-3xl font-bold text-green-600 mt-1">
                {acceptanceRate}
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-xl bg-white shadow-sm border border-l-4 border-l-blue-500">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">Avg Confidence</p>
              </div>
              <p className="text-3xl font-bold text-blue-600 mt-1">
                {avgConfidence}
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-xl bg-white shadow-sm border border-l-4 border-l-violet-500">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">Agents Active</p>
              </div>
              <p className="text-3xl font-bold text-slate-900 mt-1">
                {Object.keys(agentBreakdown).length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Agent Breakdown Table */}
        <Card className="rounded-xl bg-white shadow-sm border overflow-hidden">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-base font-semibold text-slate-800">Agent Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {Object.keys(agentBreakdown).length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Agent</TableHead>
                    <TableHead className="text-right">Invocations</TableHead>
                    <TableHead className="text-right">Avg Confidence</TableHead>
                    <TableHead className="text-right">Accepted</TableHead>
                    <TableHead className="text-right">Rejected</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(agentBreakdown)
                    .sort((a, b) => b[1].invocations - a[1].invocations)
                    .map(([agentType, stats]) => (
                      <TableRow key={agentType} className="hover:bg-blue-50/30">
                        <TableCell className="font-medium text-slate-800">
                          {formatStatus(agentType)}
                        </TableCell>
                        <TableCell className="text-right">
                          {stats.invocations}
                        </TableCell>
                        <TableCell className="text-right">
                          {stats.confidenceCount > 0
                            ? (
                                stats.totalConfidence / stats.confidenceCount
                              ).toFixed(2)
                            : "N/A"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            className="rounded-full bg-green-100 text-green-800"
                          >
                            {stats.accepted}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            className="rounded-full bg-red-100 text-red-800"
                          >
                            {stats.rejected}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center py-12">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 mb-3">
                  <Bot className="h-5 w-5 text-slate-400" />
                </div>
                <p className="text-sm text-slate-500">No agent activity recorded yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ================================================================== */}
      {/* Financial Summary */}
      {/* ================================================================== */}

      <div>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Financial Summary
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="rounded-xl bg-white shadow-sm border border-l-4 border-l-slate-400">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">Total Invoiced</p>
                <DollarSign className="h-4 w-4 text-slate-400" />
              </div>
              <p className="text-3xl font-bold text-slate-900 mt-1">
                {formatCurrency(totalInvoiced)}
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-xl bg-white shadow-sm border border-l-4 border-l-yellow-500">
            <CardContent className="p-5">
              <p className="text-sm font-medium text-slate-500">Outstanding</p>
              <p className="text-3xl font-bold text-yellow-600 mt-1">
                {formatCurrency(totalOutstanding)}
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-xl bg-white shadow-sm border border-l-4 border-l-green-500">
            <CardContent className="p-5">
              <p className="text-sm font-medium text-slate-500">Paid</p>
              <p className="text-3xl font-bold text-green-600 mt-1">
                {formatCurrency(totalPaid)}
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-xl bg-white shadow-sm border border-l-4 border-l-blue-500">
            <CardContent className="p-5">
              <p className="text-sm font-medium text-slate-500">Avg Invoice</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">
                {formatCurrency(avgInvoiceValue)}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
