import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from '@/lib/supabase/auth-api';
import { createServiceClient } from '@/lib/supabase/server';
import { updateInvoiceStatusSchema } from "@/lib/validators/schemas";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateApiRequest();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();

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

  return NextResponse.json({ invoice });
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ["sent", "cancelled"],
  sent: ["paid", "overdue", "cancelled"],
  overdue: ["paid", "cancelled"],
  paid: [],
  cancelled: [],
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateApiRequest();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  const body = await request.json();
  const parsed = updateInvoiceStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  // Get current invoice
  const { data: current, error: fetchError } = await supabase
    .from("invoices")
    .select("id, status, invoice_number")
    .eq("id", params.id)
    .single();

  if (fetchError || !current) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const allowed = VALID_TRANSITIONS[current.status] ?? [];
  if (!allowed.includes(parsed.data.status)) {
    return NextResponse.json(
      { error: `Cannot transition from ${current.status} to ${parsed.data.status}` },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = {
    status: parsed.data.status,
    updated_at: new Date().toISOString(),
  };

  if (parsed.data.status === "paid") {
    updates.paid_at = new Date().toISOString();
  }

  const { data: updated, error: updateError } = await supabase
    .from("invoices")
    .update(updates)
    .eq("id", params.id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Audit event
  await supabase.from("audit_events").insert({
    tenant_id: auth.tenantId,
    event_type: "invoice.status_changed",
    entity_type: "invoice",
    entity_id: params.id,
    actor_type: "user",
    actor_id: auth.userId,
    action: `Invoice ${current.invoice_number} status changed: ${current.status} -> ${parsed.data.status}`,
    details: {
      from_status: current.status,
      to_status: parsed.data.status,
    },
  });

  return NextResponse.json({ success: true, invoice: updated });
}
