import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { InvoiceLineItem } from "@/lib/types/database";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();

  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select(
      "*, client_account:client_accounts(id, name), entry_case:entry_cases(id, case_number)"
    )
    .eq("id", params.id)
    .single();

  if (error || !invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const clientName = Array.isArray(invoice.client_account)
    ? invoice.client_account[0]?.name ?? "Unknown"
    : (invoice.client_account as { name: string } | null)?.name ?? "Unknown";

  const caseNumber = Array.isArray(invoice.entry_case)
    ? invoice.entry_case[0]?.case_number ?? null
    : (invoice.entry_case as { case_number: string } | null)?.case_number ?? null;

  const lineItems = (invoice.line_items ?? []) as InvoiceLineItem[];
  const currency = invoice.currency as string;

  const lineItemRows = lineItems
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${escapeHtml(item.description)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;">${item.quantity}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;">${formatCurrency(item.unit_price, currency)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;">${formatCurrency(item.amount, currency)}</td>
      </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Invoice ${escapeHtml(invoice.invoice_number as string)}</title>
  <style>
    @media print {
      body { margin: 0; }
      .no-print { display: none !important; }
    }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1e293b; max-width: 800px; margin: 0 auto; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
    .company { font-size: 24px; font-weight: 700; color: #0f172a; }
    .invoice-title { font-size: 28px; font-weight: 700; color: #3b82f6; text-align: right; }
    .invoice-number { font-size: 14px; color: #64748b; text-align: right; }
    .details { display: flex; justify-content: space-between; margin-bottom: 32px; }
    .details-section { font-size: 14px; line-height: 1.6; }
    .details-label { font-weight: 600; color: #475569; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { background: #f1f5f9; padding: 10px 12px; text-align: left; font-size: 13px; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; }
    th:nth-child(2), th:nth-child(3), th:nth-child(4) { text-align: right; }
    td { font-size: 14px; }
    .totals { margin-left: auto; width: 280px; }
    .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
    .totals-row.total { font-size: 18px; font-weight: 700; border-top: 2px solid #0f172a; padding-top: 10px; margin-top: 4px; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
    .status-draft { background: #f1f5f9; color: #64748b; }
    .status-sent { background: #dbeafe; color: #1d4ed8; }
    .status-paid { background: #dcfce7; color: #15803d; }
    .status-overdue { background: #fee2e2; color: #dc2626; }
    .status-cancelled { background: #f1f5f9; color: #94a3b8; }
    .notes { margin-top: 32px; padding: 16px; background: #f8fafc; border-radius: 8px; font-size: 13px; color: #475569; }
    .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; }
    .print-btn { position: fixed; top: 20px; right: 20px; background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 14px; }
    .print-btn:hover { background: #2563eb; }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">Print / Save PDF</button>
  <div class="header">
    <div>
      <div class="company">BizOS</div>
      <div style="font-size:13px;color:#64748b;">Customs Brokerage Services</div>
    </div>
    <div>
      <div class="invoice-title">INVOICE</div>
      <div class="invoice-number">${escapeHtml(invoice.invoice_number as string)}</div>
      <div style="margin-top:8px;text-align:right;">
        <span class="status-badge status-${invoice.status}">${(invoice.status as string).toUpperCase()}</span>
      </div>
    </div>
  </div>
  <div class="details">
    <div class="details-section">
      <div class="details-label">Bill To</div>
      <div>${escapeHtml(clientName)}</div>
    </div>
    <div class="details-section" style="text-align:right;">
      <div><span class="details-label">Date:</span> ${formatDate(invoice.created_at as string)}</div>
      <div><span class="details-label">Due Date:</span> ${formatDate(invoice.due_date as string | null)}</div>
      ${invoice.paid_at ? `<div><span class="details-label">Paid:</span> ${formatDate(invoice.paid_at as string)}</div>` : ""}
      ${caseNumber ? `<div><span class="details-label">Case:</span> ${escapeHtml(caseNumber)}</div>` : ""}
      ${invoice.payment_terms ? `<div><span class="details-label">Terms:</span> ${escapeHtml(invoice.payment_terms as string)}</div>` : ""}
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Qty</th>
        <th>Unit Price</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      ${lineItemRows}
    </tbody>
  </table>
  <div class="totals">
    <div class="totals-row"><span>Subtotal</span><span>${formatCurrency(invoice.subtotal as number, currency)}</span></div>
    <div class="totals-row"><span>Tax</span><span>${formatCurrency(invoice.tax as number, currency)}</span></div>
    <div class="totals-row total"><span>Total</span><span>${formatCurrency(invoice.total as number, currency)}</span></div>
  </div>
  ${invoice.notes ? `<div class="notes"><strong>Notes:</strong> ${escapeHtml(invoice.notes as string)}</div>` : ""}
  <div class="footer">Generated by BizOS &mdash; Customs Brokerage Operating System</div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
