import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from '@/lib/supabase/auth-api';
import { createServiceClient } from '@/lib/supabase/server';
import { createInvoiceSchema } from "@/lib/validators/schemas";

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const clientId = url.searchParams.get("client");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const page = parseInt(url.searchParams.get("page") ?? "1", 10);
  const pageSize = 25;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("invoices")
    .select(
      "*, client_account:client_accounts(id, name), entry_case:entry_cases(id, case_number)",
      { count: "exact" }
    );

  if (status) {
    query = query.eq("status", status);
  }

  if (clientId) {
    query = query.eq("client_account_id", clientId);
  }

  if (from) {
    query = query.gte("created_at", from);
  }

  if (to) {
    query = query.lte("created_at", to);
  }

  query = query
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  const { data: invoices, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ invoices, count, page, pageSize });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  const body = await request.json();
  const parsed = createInvoiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  // Generate invoice number: INV-YYYYMMDD-XXXX
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const { count } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", auth.tenantId);

  const seq = String((count ?? 0) + 1).padStart(4, "0");
  const invoiceNumber = `INV-${dateStr}-${seq}`;

  const { data: invoice, error: insertError } = await supabase
    .from("invoices")
    .insert({
      tenant_id: auth.tenantId,
      invoice_number: invoiceNumber,
      client_account_id: parsed.data.client_account_id,
      entry_case_id: parsed.data.entry_case_id ?? null,
      line_items: parsed.data.line_items,
      subtotal: parsed.data.subtotal,
      tax: parsed.data.tax,
      total: parsed.data.total,
      currency: parsed.data.currency,
      payment_terms: parsed.data.payment_terms ?? null,
      due_date: parsed.data.due_date ?? null,
      notes: parsed.data.notes ?? null,
      status: "draft",
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Audit event
  await supabase.from("audit_events").insert({
    tenant_id: auth.tenantId,
    event_type: "invoice.created",
    entity_type: "invoice",
    entity_id: invoice.id,
    actor_type: "user",
    actor_id: auth.userId,
    action: `Created invoice ${invoiceNumber}`,
    details: {
      client_account_id: parsed.data.client_account_id,
      total: parsed.data.total,
    },
  });

  return NextResponse.json({ success: true, invoice }, { status: 201 });
}
