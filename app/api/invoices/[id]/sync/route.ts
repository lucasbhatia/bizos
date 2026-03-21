import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from '@/lib/supabase/auth-api';
import { createServiceClient } from '@/lib/supabase/server';
import { syncInvoice } from "@/lib/integrations/quickbooks";
import type { InvoiceLineItem } from "@/lib/types/database";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateApiRequest();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data: invoice, error: fetchError } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", params.id)
    .single();

  if (fetchError || !invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  if (invoice.qbo_invoice_id) {
    return NextResponse.json(
      { error: "Invoice already synced to QuickBooks", qbo_invoice_id: invoice.qbo_invoice_id },
      { status: 400 }
    );
  }

  try {
    const qboResponse = await syncInvoice({
      id: invoice.id as string,
      invoice_number: invoice.invoice_number as string,
      client_account_id: invoice.client_account_id as string,
      line_items: (invoice.line_items ?? []) as InvoiceLineItem[],
      subtotal: invoice.subtotal as number,
      tax: invoice.tax as number,
      total: invoice.total as number,
      due_date: invoice.due_date as string | null,
      notes: invoice.notes as string | null,
    });

    // Save QBO invoice ID back
    await supabase
      .from("invoices")
      .update({ qbo_invoice_id: qboResponse.id, updated_at: new Date().toISOString() })
      .eq("id", params.id);

    // Audit event
    await supabase.from("audit_events").insert({
      tenant_id: auth.tenantId,
      event_type: "invoice.synced_qbo",
      entity_type: "invoice",
      entity_id: params.id,
      actor_type: "user",
      actor_id: auth.userId,
      action: `Synced invoice ${invoice.invoice_number} to QuickBooks (${qboResponse.id})`,
      details: { qbo_invoice_id: qboResponse.id },
    });

    return NextResponse.json({ success: true, qbo_invoice: qboResponse });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to sync to QuickBooks";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
