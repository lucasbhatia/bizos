import { Badge } from "@/components/ui/badge";

interface ActivityEvent {
  id: string;
  created_at: string;
  action: string;
  actor_type?: string;
  actor_id?: string;
  event_type?: string;
  details?: Record<string, unknown>;
  // workflow event fields
  from_status?: string | null;
  to_status?: string;
  triggered_by_agent?: string | null;
  reason?: string | null;
  // ai log fields
  agent_type?: string;
  confidence?: number | null;
  human_decision?: string | null;
}

function formatTimestamp(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatLabel(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export function CaseActivity({
  auditEvents,
  workflowEvents,
  aiLogs,
}: {
  auditEvents: ActivityEvent[];
  workflowEvents: ActivityEvent[];
  aiLogs: ActivityEvent[];
}) {
  // Merge all events into a single timeline
  const allEvents: { type: "audit" | "workflow" | "ai"; event: ActivityEvent }[] = [
    ...auditEvents.map((e) => ({ type: "audit" as const, event: e })),
    ...workflowEvents.map((e) => ({ type: "workflow" as const, event: e })),
    ...aiLogs.map((e) => ({ type: "ai" as const, event: e })),
  ];

  allEvents.sort(
    (a, b) => new Date(b.event.created_at).getTime() - new Date(a.event.created_at).getTime()
  );

  return (
    <div className="space-y-3">
      {allEvents.length === 0 ? (
        <p className="text-sm text-slate-500 py-8 text-center">No activity yet</p>
      ) : (
        allEvents.map((item, idx) => (
          <div key={`${item.type}-${item.event.id}-${idx}`} className="flex gap-3 border-b border-slate-100 pb-3 last:border-0">
            <div className="flex-shrink-0 mt-0.5">
              {item.type === "workflow" ? (
                <Badge variant="outline" className="text-xs">Status</Badge>
              ) : item.type === "ai" ? (
                <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-800">AI</Badge>
              ) : (
                <Badge variant="outline" className="text-xs">Audit</Badge>
              )}
            </div>
            <div className="flex-1 min-w-0">
              {item.type === "workflow" ? (
                <p className="text-sm">
                  Status changed from{" "}
                  <span className="font-medium">{item.event.from_status ? formatLabel(item.event.from_status) : "—"}</span>
                  {" → "}
                  <span className="font-medium">{formatLabel(item.event.to_status ?? "")}</span>
                  {item.event.reason && (
                    <span className="text-slate-500"> — {item.event.reason}</span>
                  )}
                </p>
              ) : item.type === "ai" ? (
                <p className="text-sm">
                  <span className="font-medium">[{item.event.agent_type}]</span>{" "}
                  {item.event.action}
                  {item.event.confidence !== null && item.event.confidence !== undefined && (
                    <span className="text-slate-500"> (confidence: {Math.round(item.event.confidence * 100)}%)</span>
                  )}
                </p>
              ) : (
                <p className="text-sm">{item.event.action}</p>
              )}
              <p className="text-xs text-slate-400 mt-1">
                {formatTimestamp(item.event.created_at)}
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
