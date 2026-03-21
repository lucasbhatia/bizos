"use client";

import Link from "next/link";
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
import { ExternalLink } from "lucide-react";
import type { InvoiceStatus } from "@/lib/types/database";

interface InvoiceRow {
  id: string;
  invoice_number: string;
  status: InvoiceStatus;
  total: number;
  currency: string;
  due_date: string | null;
  created_at: string;
  qbo_invoice_id: string | null;
  client_account:
    | { id: string; name: string }
    | { id: string; name: string }[]
    | null;
  entry_case:
    | { id: string; case_number: string }
    | { id: string; case_number: string }[]
    | null;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

function getRelation<T>(val: T | T[] | null): T | null {
  if (Array.isArray(val)) return val[0] ?? null;
  return val;
}

function formatLabel(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-200",
  sent: "bg-blue-50 text-blue-700 border-blue-200",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  overdue: "bg-red-50 text-red-700 border-red-200",
  cancelled: "bg-slate-100 text-slate-500 border-slate-200",
};

export function InvoicesTable({ invoices }: { invoices: InvoiceRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-slate-50/80">
          <TableHead className="font-semibold">Invoice #</TableHead>
          <TableHead className="font-semibold">Client</TableHead>
          <TableHead className="font-semibold">Case</TableHead>
          <TableHead className="font-semibold">Status</TableHead>
          <TableHead className="text-right font-semibold">Total</TableHead>
          <TableHead className="font-semibold">Due Date</TableHead>
          <TableHead className="font-semibold">Created</TableHead>
          <TableHead className="font-semibold">QBO</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={9}
              className="text-center text-slate-500 py-12"
            >
              <p className="text-sm font-medium">No invoices found</p>
              <p className="text-xs text-slate-400 mt-1">Try adjusting your filters</p>
            </TableCell>
          </TableRow>
        ) : (
          invoices.map((inv) => {
            const client = getRelation(inv.client_account);
            const entryCase = getRelation(inv.entry_case);
            return (
              <TableRow key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                <TableCell className="font-medium">
                  <Link
                    href={`/finance/${inv.id}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {inv.invoice_number}
                  </Link>
                </TableCell>
                <TableCell className="text-sm text-slate-700">{client?.name ?? "--"}</TableCell>
                <TableCell>
                  {entryCase ? (
                    <Link
                      href={`/cases/${entryCase.id}`}
                      className="text-sm text-blue-600 hover:underline font-mono"
                    >
                      {entryCase.case_number}
                    </Link>
                  ) : (
                    <span className="text-slate-400">--</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    className={`text-xs font-medium border ${STATUS_STYLES[inv.status]}`}
                    variant="secondary"
                  >
                    {formatLabel(inv.status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-semibold text-slate-900">
                  {formatCurrency(Number(inv.total), inv.currency)}
                </TableCell>
                <TableCell className="text-sm text-slate-600">{formatDate(inv.due_date)}</TableCell>
                <TableCell className="text-xs text-slate-400">
                  {formatDate(inv.created_at)}
                </TableCell>
                <TableCell>
                  {inv.qbo_invoice_id ? (
                    <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                      Synced
                    </Badge>
                  ) : (
                    <span className="text-xs text-slate-300">--</span>
                  )}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                    <Link href={`/finance/${inv.id}`}>
                      <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}
