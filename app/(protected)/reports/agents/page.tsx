import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { UserRole, HumanDecision } from "@/lib/types/database";
import { ArrowLeft } from "lucide-react";

const EXECUTIVE_ROLES: UserRole[] = ["admin", "ops_manager", "broker_lead"];

interface AgentLog {
  id: string;
  agent_type: string;
  action: string;
  confidence: number | null;
  human_decision: HumanDecision | null;
  human_decision_reason: string | null;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  entry_case_id: string | null;
  created_at: string;
}

interface ConfidenceBucket {
  range: string;
  min: number;
  max: number;
  total: number;
  accepted: number;
  rejected: number;
  pending: number;
}

interface AgentStats {
  invocations: number;
  totalConfidence: number;
  confidenceCount: number;
  accepted: number;
  rejected: number;
  modified: number;
  pending: number;
  buckets: ConfidenceBucket[];
  overrideFields: Record<string, number>;
  dailyCounts: Record<string, number>;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAgentName(agentType: string): string {
  return agentType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function confidenceColor(c: number | null): string {
  if (c === null) return "bg-gray-100 text-gray-800";
  if (c >= 0.85) return "bg-green-100 text-green-800";
  if (c >= 0.7) return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-800";
}

function decisionColor(d: HumanDecision | null): string {
  if (d === "accepted") return "bg-green-100 text-green-800";
  if (d === "rejected") return "bg-red-100 text-red-800";
  if (d === "modified") return "bg-orange-100 text-orange-800";
  return "bg-gray-100 text-gray-700";
}

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
    <div className="space-y-1">
      {data.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <span className="w-16 text-xs text-slate-600 truncate text-right">
            {item.label}
          </span>
          <div className="flex-1 h-5 bg-slate-100 rounded overflow-hidden">
            <div
              className={`h-full rounded ${colorClass ?? "bg-blue-500"}`}
              style={{
                width: `${Math.max((item.value / safeMax) * 100, 1)}%`,
              }}
            />
          </div>
          <span className="w-6 text-xs font-semibold text-slate-700 text-right">
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export default async function AgentPerformancePage() {
  const user = await getCurrentUser();
  if (!user || !EXECUTIVE_ROLES.includes(user.role)) {
    redirect("/dashboard");
  }

  const supabase = createClient();

  // Fetch all agent logs
  const { data: agentLogs } = await supabase
    .from("ai_action_logs")
    .select("*")
    .order("created_at", { ascending: false });

  const logs: AgentLog[] = (agentLogs ?? []) as AgentLog[];

  // Last 30 days boundary
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Build per-agent stats
  const agentStats: Record<string, AgentStats> = {};

  const BUCKETS: { range: string; min: number; max: number }[] = [
    { range: "0 - 0.5", min: 0, max: 0.5 },
    { range: "0.5 - 0.7", min: 0.5, max: 0.7 },
    { range: "0.7 - 0.85", min: 0.7, max: 0.85 },
    { range: "0.85 - 1.0", min: 0.85, max: 1.0 },
  ];

  function getOrCreateStats(agentType: string): AgentStats {
    if (!agentStats[agentType]) {
      agentStats[agentType] = {
        invocations: 0,
        totalConfidence: 0,
        confidenceCount: 0,
        accepted: 0,
        rejected: 0,
        modified: 0,
        pending: 0,
        buckets: BUCKETS.map((b) => ({
          ...b,
          total: 0,
          accepted: 0,
          rejected: 0,
          pending: 0,
        })),
        overrideFields: {},
        dailyCounts: {},
      };
    }
    return agentStats[agentType];
  }

  for (const log of logs) {
    const stats = getOrCreateStats(log.agent_type);
    stats.invocations++;

    if (log.confidence !== null) {
      stats.totalConfidence += log.confidence;
      stats.confidenceCount++;

      // Put into bucket
      for (const bucket of stats.buckets) {
        if (
          log.confidence >= bucket.min &&
          (log.confidence < bucket.max ||
            (bucket.max === 1.0 && log.confidence <= 1.0))
        ) {
          bucket.total++;
          if (log.human_decision === "accepted") bucket.accepted++;
          else if (log.human_decision === "rejected") bucket.rejected++;
          else bucket.pending++;
          break;
        }
      }
    }

    if (log.human_decision === "accepted") stats.accepted++;
    else if (log.human_decision === "rejected") stats.rejected++;
    else if (log.human_decision === "modified") stats.modified++;
    else stats.pending++;

    // Track override fields
    if (
      log.human_decision === "rejected" ||
      log.human_decision === "modified"
    ) {
      const reason = log.human_decision_reason ?? log.action;
      stats.overrideFields[reason] = (stats.overrideFields[reason] ?? 0) + 1;
    }

    // Daily counts (last 30 days)
    const logDate = new Date(log.created_at);
    if (logDate >= thirtyDaysAgo) {
      const dayKey = logDate.toISOString().slice(0, 10);
      stats.dailyCounts[dayKey] = (stats.dailyCounts[dayKey] ?? 0) + 1;
    }
  }

  // Build 30-day time series for the bar chart
  const dailyLabels: string[] = [];
  const dailyValues: number[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dailyLabels.push(`${d.getMonth() + 1}/${d.getDate()}`);
    // Sum across all agents
    let total = 0;
    for (const stats of Object.values(agentStats)) {
      total += stats.dailyCounts[key] ?? 0;
    }
    dailyValues.push(total);
  }

  const maxDaily = Math.max(...dailyValues, 1);

  // Recent actions (latest 20)
  const recentLogs = logs.slice(0, 20);

  // Overall totals
  const totalInvocations = logs.length;
  const totalAccepted = logs.filter(
    (l) => l.human_decision === "accepted"
  ).length;
  const totalRejected = logs.filter(
    (l) => l.human_decision === "rejected"
  ).length;
  const totalDecisions = totalAccepted + totalRejected;
  const overallAcceptanceRate =
    totalDecisions > 0
      ? `${Math.round((totalAccepted / totalDecisions) * 100)}%`
      : "N/A";

  const totalConfidence = logs.reduce(
    (sum, l) => sum + (l.confidence ?? 0),
    0
  );
  const confidenceCount = logs.filter((l) => l.confidence !== null).length;
  const avgConfidence =
    confidenceCount > 0 ? (totalConfidence / confidenceCount).toFixed(2) : "N/A";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/reports">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Reports
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Agent Performance
          </h1>
          <p className="text-sm text-slate-500">
            Detailed agent metrics, confidence calibration, and override
            analysis
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">
              Total Invocations
            </p>
            <p className="text-3xl font-bold text-slate-900">
              {totalInvocations}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">
              Acceptance Rate
            </p>
            <p className="text-3xl font-bold text-green-600">
              {overallAcceptanceRate}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">
              Avg Confidence
            </p>
            <p className="text-3xl font-bold text-blue-600">{avgConfidence}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">Active Agents</p>
            <p className="text-3xl font-bold text-slate-900">
              {Object.keys(agentStats).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Invocations time series (last 30 days) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Agent Invocations — Last 30 Days
          </CardTitle>
        </CardHeader>
        <CardContent>
          {totalInvocations > 0 ? (
            <div className="flex items-end gap-[2px] h-32">
              {dailyValues.map((val, i) => (
                <div
                  key={dailyLabels[i]}
                  className="flex-1 flex flex-col items-center justify-end group relative"
                >
                  <div
                    className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors min-h-[2px]"
                    style={{
                      height: `${Math.max((val / maxDaily) * 100, 2)}%`,
                    }}
                  />
                  <div className="absolute -top-6 hidden group-hover:block bg-slate-800 text-white text-xs px-1.5 py-0.5 rounded whitespace-nowrap">
                    {dailyLabels[i]}: {val}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No invocations recorded</p>
          )}
          {totalInvocations > 0 && (
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>{dailyLabels[0]}</span>
              <span>{dailyLabels[dailyLabels.length - 1]}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Per-agent drill-down */}
      {Object.entries(agentStats)
        .sort((a, b) => b[1].invocations - a[1].invocations)
        .map(([agentType, stats]) => {
          const agentAvgConf =
            stats.confidenceCount > 0
              ? (stats.totalConfidence / stats.confidenceCount).toFixed(2)
              : "N/A";
          const agentAccRate =
            stats.accepted + stats.rejected > 0
              ? `${Math.round(
                  (stats.accepted / (stats.accepted + stats.rejected)) * 100
                )}%`
              : "N/A";

          // Top override fields
          const topOverrides = Object.entries(stats.overrideFields)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

          return (
            <Card key={agentType}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {formatAgentName(agentType)}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Badge variant="secondary">
                      {stats.invocations} invocations
                    </Badge>
                    <Badge className="bg-green-100 text-green-800">
                      {agentAccRate} accepted
                    </Badge>
                    <Badge className="bg-blue-100 text-blue-800">
                      Avg conf: {agentAvgConf}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {/* Confidence calibration */}
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      Confidence Calibration
                    </p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Range</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-right">
                            Accepted
                          </TableHead>
                          <TableHead className="text-right">
                            Rejected
                          </TableHead>
                          <TableHead className="text-right">
                            Accept Rate
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stats.buckets.map((bucket) => {
                          const bucketDecisions =
                            bucket.accepted + bucket.rejected;
                          const bucketRate =
                            bucketDecisions > 0
                              ? `${Math.round(
                                  (bucket.accepted / bucketDecisions) * 100
                                )}%`
                              : "—";
                          return (
                            <TableRow key={bucket.range}>
                              <TableCell className="font-mono text-sm">
                                {bucket.range}
                              </TableCell>
                              <TableCell className="text-right">
                                {bucket.total}
                              </TableCell>
                              <TableCell className="text-right text-green-700">
                                {bucket.accepted}
                              </TableCell>
                              <TableCell className="text-right text-red-700">
                                {bucket.rejected}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {bucketRate}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Human override analysis */}
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      Human Override Analysis
                    </p>
                    {topOverrides.length > 0 ? (
                      <BarChart
                        data={topOverrides.map(([field, count]) => ({
                          label:
                            field.length > 20
                              ? field.slice(0, 20) + "..."
                              : field,
                          value: count,
                        }))}
                        maxValue={Math.max(
                          ...topOverrides.map(([, c]) => c),
                          1
                        )}
                        colorClass="bg-orange-500"
                      />
                    ) : (
                      <p className="text-sm text-slate-500">
                        No overrides recorded
                      </p>
                    )}

                    <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-green-50 rounded p-2 text-center">
                        <p className="text-xs text-green-600">Accepted</p>
                        <p className="font-bold text-green-800">
                          {stats.accepted}
                        </p>
                      </div>
                      <div className="bg-red-50 rounded p-2 text-center">
                        <p className="text-xs text-red-600">Rejected</p>
                        <p className="font-bold text-red-800">
                          {stats.rejected}
                        </p>
                      </div>
                      <div className="bg-orange-50 rounded p-2 text-center">
                        <p className="text-xs text-orange-600">Modified</p>
                        <p className="font-bold text-orange-800">
                          {stats.modified}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded p-2 text-center">
                        <p className="text-xs text-gray-600">Pending</p>
                        <p className="font-bold text-gray-800">
                          {stats.pending}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

      {Object.keys(agentStats).length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-slate-500">
            No agent activity recorded yet.
          </CardContent>
        </Card>
      )}

      {/* Recent agent actions log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Agent Actions</CardTitle>
        </CardHeader>
        <CardContent>
          {recentLogs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Decision</TableHead>
                  <TableHead>Case</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">
                      {formatAgentName(log.agent_type)}
                    </TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">
                      {log.action}
                    </TableCell>
                    <TableCell>
                      <Badge className={confidenceColor(log.confidence)}>
                        {log.confidence !== null
                          ? `${(log.confidence * 100).toFixed(0)}%`
                          : "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={decisionColor(log.human_decision)}>
                        {log.human_decision ?? "pending"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {log.entry_case_id
                        ? log.entry_case_id.slice(0, 8) + "..."
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {formatDate(log.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-slate-500">No agent actions recorded</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
