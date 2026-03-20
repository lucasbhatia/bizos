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
import { ArrowUpDown, ExternalLink } from "lucide-react";
import { STATUS_COLORS, PRIORITY_COLORS } from "@/lib/types/database";
import type { CaseStatus, PriorityLevel, TransportMode } from "@/lib/types/database";

interface CaseRow {
  id: string;
  case_number: string;
  mode_of_transport: TransportMode;
  status: CaseStatus;
  priority: PriorityLevel;
  eta: string | null;
  updated_at: string;
  client_account: { id: string; name: string } | { id: string; name: string }[] | null;
  assigned_user: { id: string; full_name: string } | { id: string; full_name: string }[] | null;
}

function formatLabel(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
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

const MODE_EMOJI: Record<TransportMode, string> = {
  ocean: "🚢",
  air: "✈️",
  truck: "🚛",
  rail: "🚂",
};

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
          className="-ml-3 font-medium"
          onClick={() => toggleSort(field)}
        >
          {label}
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      </TableHead>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <SortHeader field="case_number" label="Case #" />
            <TableHead>Client</TableHead>
            <TableHead>Mode</TableHead>
            <SortHeader field="status" label="Status" />
            <SortHeader field="priority" label="Priority" />
            <SortHeader field="eta" label="ETA" />
            <TableHead>Assigned To</TableHead>
            <SortHeader field="updated_at" label="Last Updated" />
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {cases.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-slate-500 py-8">
                No cases found
              </TableCell>
            </TableRow>
          ) : (
            cases.map((c) => {
              const client = getRelation(c.client_account);
              const assignee = getRelation(c.assigned_user);
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    <Link href={`/cases/${c.id}`} className="hover:underline">
                      {c.case_number}
                    </Link>
                  </TableCell>
                  <TableCell>{client?.name ?? "—"}</TableCell>
                  <TableCell>
                    {MODE_EMOJI[c.mode_of_transport]} {formatLabel(c.mode_of_transport)}
                  </TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[c.status]} variant="secondary">
                      {formatLabel(c.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={PRIORITY_COLORS[c.priority]} variant="secondary">
                      {c.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(c.eta)}</TableCell>
                  <TableCell>{assignee?.full_name ?? "Unassigned"}</TableCell>
                  <TableCell className="text-xs text-slate-400">
                    {formatDate(c.updated_at)}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/cases/${c.id}`}>
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
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
