import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from '@/lib/supabase/auth-api';
import { createServiceClient } from '@/lib/supabase/server';
import { submitFiling } from "@/lib/integrations/edi-bridge";
import type { FilingSubmission, FilingLineItem } from "@/lib/integrations/edi-bridge";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateApiRequest();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  // Fetch case with client
  const { data: entryCase } = await supabase
    .from("entry_cases")
    .select("*, client_account:client_accounts(*)")
    .eq("id", params.id)
    .single();

  if (!entryCase) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  const metadata = (entryCase.metadata ?? {}) as Record<string, unknown>;
  const clientRaw = entryCase.client_account;
  const clientObj = Array.isArray(clientRaw) ? clientRaw[0] : clientRaw;

  // Get approved classifications
  const approvedClassifications = (
    (metadata.approved_classifications as
      | { line_item_index: number; hts_code: string }[]
      | undefined) ?? []
  );

  // Fetch documents
  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .eq("entry_case_id", params.id);

  const docs = documents ?? [];

  // Extract line items
  interface ExtractedLineItem {
    description: string;
    quantity?: number;
    unit_price?: number;
    total?: number;
    country_of_origin?: string;
  }

  const rawLineItems: ExtractedLineItem[] = [];
  for (const doc of docs) {
    if (doc.doc_type === "commercial_invoice") {
      const extracted = (doc.extracted_data ?? {}) as {
        line_items?: ExtractedLineItem[];
      };
      if (extracted.line_items) {
        rawLineItems.push(...extracted.line_items);
      }
    }
  }

  // Build filing line items with HTS codes
  const filingLineItems: FilingLineItem[] = rawLineItems.map((li, i) => {
    const classification = approvedClassifications.find(
      (c) => c.line_item_index === i
    );
    return {
      htsCode: classification?.hts_code ?? "",
      description: li.description,
      quantity: li.quantity ?? 1,
      value: li.total ?? 0,
      countryOfOrigin: li.country_of_origin ?? "Unknown",
      dutyRate: "",
    };
  });

  const submission: FilingSubmission = {
    caseId: entryCase.id,
    caseNumber: entryCase.case_number,
    importerOfRecord: clientObj?.importer_of_record_number ?? "",
    transportMode: entryCase.mode_of_transport,
    eta: entryCase.eta,
    portOfEntry: null,
    lineItems: filingLineItems,
    documents: docs.map((d) => ({
      docType: d.doc_type,
      fileName: d.file_name,
    })),
    submittedBy: auth.fullName,
    submittedAt: new Date().toISOString(),
  };

  // Submit via EDI bridge
  const response = await submitFiling(submission);

  // Store submission record in case metadata
  const filingHistory = (
    (metadata.filing_history as
      | {
          filing_id: string;
          status: string;
          provider: string;
          submitted_at: string;
          submitted_by: string;
          reference_number: string | null;
          case_id: string;
          last_updated: string;
        }[]
      | undefined) ?? []
  );

  filingHistory.push({
    filing_id: response.filingId,
    status: response.status,
    provider: response.provider,
    submitted_at: response.submittedAt,
    submitted_by: auth.fullName,
    reference_number: response.referenceNumber,
    case_id: entryCase.id,
    last_updated: response.submittedAt,
  });

  await supabase
    .from("entry_cases")
    .update({
      metadata: {
        ...metadata,
        filing_history: filingHistory,
      },
    })
    .eq("id", params.id);

  // Create audit event
  await supabase.from("audit_events").insert({
    tenant_id: auth.tenantId,
    event_type: "filing.submitted",
    entity_type: "entry_case",
    entity_id: entryCase.id,
    actor_type: "user",
    actor_id: auth.userId,
    action: `Submitted filing ${response.filingId} for case ${entryCase.case_number}`,
    details: {
      filing_id: response.filingId,
      provider: response.provider,
      line_items_count: filingLineItems.length,
    },
  });

  return NextResponse.json({
    success: true,
    filing: response,
  });
}
