import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  const supabase = createClient();

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">
              {invoice.invoice_number}
            </h1>
            <Badge
              className={INVOICE_STATUS_COLORS[status]}
              variant="secondary"
            >
              {formatLabel(status)}
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {clientName ?? "Unknown client"}
            {entryCase
              ? ` | Case ${entryCase.case_number}`
              : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/api/invoices/${params.id}/pdf`} target="_blank">
              Print / PDF
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/finance">Back to Finance</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Invoice Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Line Items</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.unit_price, currency)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.amount, currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Totals */}
              <div className="mt-4 ml-auto w-64 space-y-2 border-t pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span>
                    {formatCurrency(Number(invoice.subtotal), currency)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Tax</span>
                  <span>
                    {formatCurrency(Number(invoice.tax), currency)}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total</span>
                  <span>
                    {formatCurrency(Number(invoice.total), currency)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {invoice.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notes</CardTitle>
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
          {/* Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs font-medium text-slate-500">Client</p>
                <p className="text-sm font-medium">{clientName ?? "Unknown"}</p>
              </div>
              {entryCase && (
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Linked Case
                  </p>
                  <Link
                    href={`/cases/${entryCase.id}`}
                    className="text-sm font-medium text-blue-600 hover:underline"
                  >
                    {entryCase.case_number}
                  </Link>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-slate-500">Currency</p>
                <p className="text-sm">{currency}</p>
              </div>
              {invoice.payment_terms && (
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Payment Terms
                  </p>
                  <p className="text-sm">{invoice.payment_terms}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-slate-500">Created</p>
                <p className="text-sm">
                  {formatDate(invoice.created_at as string)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Due Date</p>
                <p className="text-sm">
                  {formatDate(invoice.due_date as string | null)}
                </p>
              </div>
              {invoice.paid_at && (
                <div>
                  <p className="text-xs font-medium text-slate-500">Paid At</p>
                  <p className="text-sm text-green-600 font-medium">
                    {formatDate(invoice.paid_at as string)}
                  </p>
                </div>
              )}
              {invoice.qbo_invoice_id && (
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    QuickBooks ID
                  </p>
                  <Badge variant="outline" className="text-xs">
                    {invoice.qbo_invoice_id}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Actions</CardTitle>
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
