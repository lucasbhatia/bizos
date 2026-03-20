import { Check, Circle, Minus } from "lucide-react";
import type { CaseStatus } from "@/lib/types/database";

const STATUS_ORDER: CaseStatus[] = [
  "intake", "awaiting_docs", "docs_validated", "classification_review",
  "entry_prep", "submitted", "govt_review", "released", "billing", "closed",
];

function formatLabel(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

interface WorkflowEvent {
  from_status: string | null;
  to_status: string;
  created_at: string;
  triggered_by: { full_name: string } | { full_name: string }[] | null;
}

export function CaseTimeline({
  currentStatus,
  workflowEvents,
}: {
  currentStatus: CaseStatus;
  workflowEvents: WorkflowEvent[];
}) {
  const currentIdx = STATUS_ORDER.indexOf(currentStatus);
  // Handle "hold" specially
  const isOnHold = currentStatus === "hold";

  const visitedStatuses = new Set(workflowEvents.map((e) => e.to_status));

  return (
    <div className="space-y-3">
      {STATUS_ORDER.map((status, idx) => {
        const isCompleted = visitedStatuses.has(status) && status !== currentStatus;
        const isCurrent = status === currentStatus;
        const isFuture = !isCompleted && !isCurrent;

        return (
          <div key={status} className="flex items-center gap-3">
            <div className="flex-shrink-0">
              {isCompleted ? (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
                  <Check className="h-3.5 w-3.5 text-green-600" />
                </div>
              ) : isCurrent ? (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500">
                  <Circle className="h-3 w-3 fill-white text-white" />
                </div>
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100">
                  <Minus className="h-3 w-3 text-slate-400" />
                </div>
              )}
            </div>
            <span
              className={`text-sm ${
                isCurrent
                  ? "font-semibold text-blue-700"
                  : isCompleted
                  ? "text-slate-600"
                  : "text-slate-400"
              }`}
            >
              {formatLabel(status)}
            </span>
          </div>
        );
      })}
      {isOnHold && (
        <div className="flex items-center gap-3 mt-2 pt-2 border-t">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500">
            <Circle className="h-3 w-3 fill-white text-white" />
          </div>
          <span className="text-sm font-semibold text-red-700">On Hold</span>
        </div>
      )}
    </div>
  );
}
