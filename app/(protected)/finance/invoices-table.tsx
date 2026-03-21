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
import { INVOICE_STATUS_COLORS } from "@/lib/types/database";
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

export function InvoicesTable({ invoices }: { invoices: InvoiceRow[] }) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice #</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Case</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>QBO</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={9}
                className="text-center text-slate-500 py-8"
              >
                No invoices found
              </TableCell>
            </TableRow>
          ) : (
            invoices.map((inv) => {
              const client = getRelation(inv.client_account);
              const entryCase = getRelation(inv.entry_case);
              return (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/finance/${inv.id}`}
                      className="hover:underline"
                    >
                      {inv.invoice_number}
                    </Link>
                  </TableCell>
                  <TableCell>{client?.name ?? "--"}</TableCell>
                  <TableCell>
                    {entryCase ? (
                      <Link
                        href={`/cases/${entryCase.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {entryCase.case_number}
                      </Link>
                    ) : (
                      "--"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={INVOICE_STATUS_COLORS[inv.status]}
                      variant="secondary"
                    >
                      {formatLabel(inv.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(Number(inv.total), inv.currency)}
                  </TableCell>
                  <TableCell>{formatDate(inv.due_date)}</TableCell>
                  <TableCell className="text-xs text-slate-400">
                    {formatDate(inv.created_at)}
                  </TableCell>
                  <TableCell>
                    {inv.qbo_invoice_id ? (
                      <Badge variant="outline" className="text-xs">
                        Synced
                      </Badge>
                    ) : (
                      <span className="text-xs text-slate-400">--</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/finance/${inv.id}`}>
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
