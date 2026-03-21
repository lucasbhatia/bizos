"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUS_COLORS, PRIORITY_COLORS } from "@/lib/types/database";
import { STATUS_COLOR_MAP, PRIORITY_COLOR_MAP } from "@/lib/design/tokens";
import type {
  CaseStatus,
  PriorityLevel,
  TransportMode,
} from "@/lib/types/database";

interface CaseRow {
  id: string;
  case_number: string;
  mode_of_transport: TransportMode;
  status: CaseStatus;
  priority: PriorityLevel;
  eta: string | null;
  updated_at: string;
  client_account:
    | { id: string; name: string }
    | { id: string; name: string }[]
    | null;
  assigned_user:
    | { id: string; full_name: string }
    | { id: string; full_name: string }[]
    | null;
}

function formatLabel(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getRelation<T>(val: T | T[] | null): T | null {
  if (Array.isArray(val)) return val[0] ?? null;
  return val;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const KANBAN_STATUSES: CaseStatus[] = [
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

const VALID_MOVES: Record<CaseStatus, CaseStatus[]> = {
  intake: ["awaiting_docs"],
  awaiting_docs: ["docs_validated"],
  docs_validated: ["classification_review"],
  classification_review: ["entry_prep"],
  entry_prep: ["submitted"],
  submitted: ["govt_review"],
  govt_review: ["released", "hold"],
  hold: ["entry_prep"],
  released: ["billing"],
  billing: ["closed"],
  closed: ["archived"],
  archived: [],
};

const COLUMN_HEADER_COLORS: Record<string, string> = {
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

export function KanbanView({ cases }: { cases: CaseRow[] }) {
  const router = useRouter();

  // Group cases by status
  const columns: Record<string, CaseRow[]> = {};
  for (const status of KANBAN_STATUSES) {
    columns[status] = [];
  }
  for (const c of cases) {
    if (columns[c.status]) {
      columns[c.status].push(c);
    }
  }

  async function handleMove(caseId: string, newStatus: string) {
    try {
      await fetch(`/api/cases/${caseId}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to_status: newStatus }),
      });
      router.refresh();
    } catch {
      // Silently handle errors - the page will show the unchanged state
    }
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="inline-flex gap-4 min-w-max">
        {KANBAN_STATUSES.map((status) => {
          const items = columns[status];
          const headerColor = COLUMN_HEADER_COLORS[status] ?? "bg-slate-500";
          return (
            <div
              key={status}
              className="w-72 flex-shrink-0 rounded-xl bg-slate-100/80"
            >
              {/* Column header */}
              <div className="px-3 pt-3 pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${headerColor}`}
                    />
                    <span className="text-sm font-semibold text-slate-700">
                      {formatLabel(status)}
                    </span>
                  </div>
                  <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-white px-1.5 text-xs font-semibold text-slate-600 shadow-sm">
                    {items.length}
                  </span>
                </div>
              </div>

              {/* Cards */}
              <div className="space-y-2 px-2 pb-3">
                {items.length === 0 && (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-white/50 px-3 py-6 text-center text-xs text-slate-400">
                    No cases
                  </div>
                )}
                {items.map((c) => {
                  const client = getRelation(c.client_account);
                  const assignee = getRelation(c.assigned_user);
                  const moves = VALID_MOVES[c.status] ?? [];
                  const priorityToken = PRIORITY_COLOR_MAP[c.priority];
                  return (
                    <div
                      key={c.id}
                      className="rounded-lg bg-white p-3 shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => router.push(`/cases/${c.id}`)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900">
                          {c.case_number}
                        </span>
                        <div
                          className={`h-2.5 w-2.5 rounded-full ${priorityToken.dot} shrink-0 mt-1`}
                          title={c.priority}
                        />
                      </div>
                      <p className="mt-1 text-sm font-medium text-slate-700 truncate">
                        {client?.name ?? "Unknown client"}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        {c.eta ? (
                          <span className="text-xs text-slate-500">
                            ETA {formatDate(c.eta)}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">
                            No ETA
                          </span>
                        )}
                        {assignee ? (
                          <div
                            className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[10px] font-semibold text-blue-700"
                            title={assignee.full_name}
                          >
                            {getInitials(assignee.full_name)}
                          </div>
                        ) : (
                          <div
                            className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-medium text-slate-400"
                            title="Unassigned"
                          >
                            ?
                          </div>
                        )}
                      </div>
                      {/* Move to dropdown */}
                      {moves.length > 0 && (
                        <div
                          className="mt-2 pt-2 border-t border-slate-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Select
                            onValueChange={(v) => handleMove(c.id, v)}
                          >
                            <SelectTrigger className="h-7 text-xs bg-slate-50 border-slate-200">
                              <SelectValue placeholder="Move to..." />
                            </SelectTrigger>
                            <SelectContent>
                              {moves.map((m) => (
                                <SelectItem key={m} value={m}>
                                  {formatLabel(m)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
