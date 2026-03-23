"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// ============================================================================
// Status Bar Chart
// ============================================================================

interface StatusBarDatum {
  name: string;
  count: number;
  fill: string;
}

const STATUS_CHART_COLORS: Record<string, string> = {
  intake: "#f59e0b",
  awaiting_docs: "#fbbf24",
  docs_validated: "#3b82f6",
  classification_review: "#60a5fa",
  entry_prep: "#2563eb",
  submitted: "#8b5cf6",
  govt_review: "#a78bfa",
  hold: "#ef4444",
  released: "#22c55e",
  billing: "#4ade80",
};

function formatStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export function StatusBarChart({
  data,
}: {
  data: StatusBarDatum[];
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-400">
        No active cases
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 4 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          width={130}
          tick={{ fontSize: 12, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "rgba(0,0,0,0.04)" }}
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
            fontSize: "13px",
          }}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={16}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function prepareStatusData(
  statusCounts: Record<string, number>,
  statusOrder: string[]
): StatusBarDatum[] {
  return statusOrder
    .filter((s) => (statusCounts[s] ?? 0) > 0)
    .map((s) => ({
      name: formatStatus(s),
      count: statusCounts[s] ?? 0,
      fill: STATUS_CHART_COLORS[s] ?? "#94a3b8",
    }));
}

// ============================================================================
// Weekly Area Chart
// ============================================================================

interface WeeklyDatum {
  day: string;
  count: number;
}

export function WeeklyAreaChart({ data }: { data: WeeklyDatum[] }) {
  const hasData = data.some((d) => d.count > 0);

  if (!hasData) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-slate-400">
        No cases created this week
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="day"
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
            fontSize: "13px",
          }}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke="#3b82f6"
          strokeWidth={2}
          fill="url(#areaFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ============================================================================
// Agent Pie Chart
// ============================================================================

interface AgentDatum {
  name: string;
  value: number;
}

const AGENT_COLORS = ["#3b82f6", "#8b5cf6", "#14b8a6", "#f59e0b", "#ef4444", "#ec4899"];

export function AgentPieChart({ data }: { data: AgentDatum[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-slate-400">
        No agent activity yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={75}
          paddingAngle={3}
          dataKey="value"
          stroke="none"
        >
          {data.map((_entry, index) => (
            <Cell key={`cell-${index}`} fill={AGENT_COLORS[index % AGENT_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
            fontSize: "13px",
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ============================================================================
// Mini Sparkline for stat cards
// ============================================================================

interface SparklineDatum {
  value: number;
}

export function MiniSparkline({
  data,
  color = "#3b82f6",
}: {
  data: SparklineDatum[];
  color?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={32}>
      <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <defs>
          <linearGradient id={`spark-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#spark-${color.replace("#", "")})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
