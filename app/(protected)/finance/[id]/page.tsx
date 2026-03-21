import { createServiceClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { INVOICE_STATUS_COLORS } from "@/lib/types/database";
import type { InvoiceStatus, InvoiceLineItem } from "@/lib/types/database";
import { InvoiceActions } from "./invoice-actions";
import { FileText, ArrowLeft } from "lucide-react";

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatLabel(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createServiceClient();

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select(
      "*, client_account:client_accounts(id, name), entry_case:entry_cases(id, case_number)"
    )
    .eq("id", params.id)
    .single();

  if (error || !invoice) {
    notFound();
  }

  const clientName = Array.isArray(invoice.client_account)
    ? invoice.client_account[0]?.name
    : (invoice.client_account as { id: string; name: string } | null)?.name;

  const entryCase = Array.isArray(invoice.entry_case)
    ? invoice.entry_case[0]
    : (invoice.entry_case as { id: string; case_number: string } | null);

  const lineItems = (invoice.line_items ?? []) as InvoiceLineItem[];
  const status = invoice.status as InvoiceStatus;
  const currency = invoice.currency as string;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Back link */}
      <Button variant="ghost" size="sm" className="gap-1.5 text-slate-500" asChild>
        <Link href="/finance">
          <ArrowLeft className="h-4 w-4" />
          Back to Finance
        </Link>
      </Button>

      {/* Invoice header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">
              {invoice.invoice_number}
            </h1>
            <Badge
              className={`${INVOICE_STATUS_COLORS[status]} px-3 py-1 text-xs font-semibold`}
              variant="secondary"
            >
              {formatLabel(status)}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {clientName ?? "Unknown client"}
            {entryCase ? ` | Case ${entryCase.case_number}` : ""}
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" asChild>
          <Link href={`/api/invoices/${params.id}/pdf`} target="_blank">
            <FileText className="h-4 w-4" />
            Print / PDF
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Invoice content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Professional invoice layout */}
          <Card>
            <CardContent className="p-6">
              {/* Invoice meta */}
              <div className="mb-6 grid grid-cols-2 gap-6">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                    Bill To
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {clientName ?? "Unknown"}
                  </p>
                </div>
                <div className="text-right">
                  <div className="space-y-1">
                    <div>
                      <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                        Invoice Date
                      </span>
                      <p className="text-sm text-slate-700">
                        {formatDate(invoice.created_at as string)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                        Due Date
                      </span>
                      <p className="text-sm font-medium text-slate-700">
                        {formatDate(invoice.due_date as string | null)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator className="mb-6" />

              {/* Line items table */}
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-slate-200 hover:bg-transparent">
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Description
                    </TableHead>
                    <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Qty
                    </TableHead>
                    <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Unit Price
                    </TableHead>
                    <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Amount
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((item, idx) => (
                    <TableRow key={idx} className="border-b border-slate-100">
                      <TableCell className="text-sm text-slate-700">
                        {item.description}
                      </TableCell>
                      <TableCell className="text-right text-sm text-slate-600">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right text-sm text-slate-600">
                        {formatCurrency(item.unit_price, currency)}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium text-slate-800">
                        {formatCurrency(item.amount, currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Totals */}
              <div className="mt-6 ml-auto w-72">
                <div className="space-y-2 rounded-lg bg-slate-50 p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Subtotal</span>
                    <span className="text-slate-700">
                      {formatCurrency(Number(invoice.subtotal), currency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Tax</span>
                    <span className="text-slate-700">
                      {formatCurrency(Number(invoice.tax), currency)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between pt-1">
                    <span className="text-base font-bold text-slate-900">
                      Total
                    </span>
                    <span className="text-base font-bold text-slate-900">
                      {formatCurrency(Number(invoice.total), currency)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {invoice.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">
                  {invoice.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Details card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  Client
                </p>
                <p className="mt-0.5 text-sm font-medium text-slate-800">
                  {clientName ?? "Unknown"}
                </p>
              </div>
              {entryCase && (
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                    Linked Case
                  </p>
                  <Link
                    href={`/cases/${entryCase.id}`}
                    className="mt-0.5 inline-block text-sm font-medium text-blue-600 hover:underline"
                  >
                    {entryCase.case_number}
                  </Link>
                </div>
              )}
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  Currency
                </p>
                <p className="mt-0.5 text-sm text-slate-700">{currency}</p>
              </div>
              {invoice.payment_terms && (
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                    Payment Terms
                  </p>
                  <p className="mt-0.5 text-sm text-slate-700">
                    {invoice.payment_terms}
                  </p>
                </div>
              )}
              <Separator />
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  Created
                </p>
                <p className="mt-0.5 text-sm text-slate-700">
                  {formatDate(invoice.created_at as string)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  Due Date
                </p>
                <p className="mt-0.5 text-sm text-slate-700">
                  {formatDate(invoice.due_date as string | null)}
                </p>
              </div>
              {invoice.paid_at && (
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                    Paid At
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-green-600">
                    {formatDate(invoice.paid_at as string)}
                  </p>
                </div>
              )}
              {invoice.qbo_invoice_id && (
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                    QuickBooks ID
                  </p>
                  <Badge variant="outline" className="mt-0.5 text-xs">
                    {invoice.qbo_invoice_id}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <InvoiceActions
                invoiceId={params.id}
                currentStatus={status}
                hasQboSync={!!invoice.qbo_invoice_id}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
