"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";
import { STATUS_COLORS, PRIORITY_COLORS } from "@/lib/types/database";
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
  if (!dateStr) return "\u2014";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getRelation<T>(val: T | T[] | null): T | null {
  if (Array.isArray(val)) return val[0] ?? null;
  return val;
}

const MODE_LABELS: Record<TransportMode, { icon: string; label: string }> = {
  ocean: { icon: "O", label: "Ocean" },
  air: { icon: "A", label: "Air" },
  truck: { icon: "T", label: "Truck" },
  rail: { icon: "R", label: "Rail" },
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function CasesTable({
  cases,
  currentSort,
  currentOrder,
}: {
  cases: CaseRow[];
  currentSort: string;
  currentOrder: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function toggleSort(field: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (currentSort === field) {
      params.set("order", currentOrder === "asc" ? "desc" : "asc");
    } else {
      params.set("sort", field);
      params.set("order", "asc");
    }
    router.push(`/cases?${params.toString()}`);
  }

  function SortHeader({ field, label }: { field: string; label: string }) {
    return (
      <TableHead>
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 font-medium text-slate-500"
          onClick={() => toggleSort(field)}
        >
          {label}
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      </TableHead>
    );
  }

  return (
    <div className="rounded-xl bg-white shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
            <SortHeader field="case_number" label="Case #" />
            <TableHead className="text-slate-500 font-medium">
              Client
            </TableHead>
            <TableHead className="text-slate-500 font-medium">Mode</TableHead>
            <SortHeader field="status" label="Status" />
            <SortHeader field="priority" label="Priority" />
            <SortHeader field="eta" label="ETA" />
            <TableHead className="text-slate-500 font-medium">
              Assigned
            </TableHead>
            <SortHeader field="updated_at" label="Updated" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {cases.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={8}
                className="text-center text-slate-500 py-12"
              >
                <p className="text-base font-medium">No cases found</p>
                <p className="text-sm text-slate-400 mt-1">
                  Try adjusting your filters
                </p>
              </TableCell>
            </TableRow>
          ) : (
            cases.map((c, idx) => {
              const client = getRelation(c.client_account);
              const assignee = getRelation(c.assigned_user);
              const mode = MODE_LABELS[c.mode_of_transport];
              return (
                <TableRow
                  key={c.id}
                  className={`cursor-pointer h-14 transition-colors hover:bg-blue-50/40 ${
                    idx % 2 === 1 ? "bg-slate-50/40" : ""
                  }`}
                  onClick={() => router.push(`/cases/${c.id}`)}
                >
                  <TableCell className="font-mono text-sm font-semibold text-slate-900">
                    {c.case_number}
                  </TableCell>
                  <TableCell className="text-sm font-medium text-slate-700">
                    {client?.name ?? "\u2014"}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-slate-100 text-xs font-bold text-slate-600">
                      {mode.icon}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={STATUS_COLORS[c.status]}
                      variant="secondary"
                    >
                      {formatLabel(c.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={PRIORITY_COLORS[c.priority]}
                      variant="secondary"
                    >
                      {c.priority}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {formatDate(c.eta)}
                  </TableCell>
                  <TableCell>
                    {assignee ? (
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                          {getInitials(assignee.full_name)}
                        </div>
                        <span className="text-sm text-slate-600">
                          {assignee.full_name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400">
                        Unassigned
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-slate-400">
                    {formatDate(c.updated_at)}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
