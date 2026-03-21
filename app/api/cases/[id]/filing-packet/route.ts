import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from '@/lib/supabase/auth-api';
import { createServiceClient } from '@/lib/supabase/server';
import type { DocType, TransportMode } from "@/lib/types/database";
import { REQUIRED_DOCS_BY_MODE } from "@/lib/types/database";

interface ChecklistItem {
  label: string;
  category: "documents" | "classifications" | "client_info" | "case_info";
  passed: boolean;
  detail: string;
}

interface FilingPacket {
  caseId: string;
  caseNumber: string;
  status: string;
  mode: string;
  eta: string | null;
  actualArrival: string | null;
  priority: string;
  riskScore: number | null;
  client: {
    name: string;
    importerOfRecordNumber: string | null;
    billingTerms: Record<string, unknown>;
  } | null;
  classifications: { lineItemIndex: number; htsCode: string }[];
  documents: {
    id: string;
    docType: string;
    fileName: string;
    parseStatus: string;
    extractedData: Record<string, unknown>;
  }[];
  lineItems: {
    description: string;
    quantity?: number;
    unitPrice?: number;
    total?: number;
    countryOfOrigin?: string;
    hsCodeHint?: string;
  }[];
  filingHistory: {
    submittedAt: string;
    status: string;
    filingId: string;
    provider: string;
  }[];
  generatedAt: string;
}

export async function GET(
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

  // Fetch documents
  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .eq("entry_case_id", params.id)
    .order("created_at", { ascending: false });

  const docs = documents ?? [];
  const metadata = (entryCase.metadata ?? {}) as Record<string, unknown>;
  const mode = entryCase.mode_of_transport as TransportMode;
  const requiredDocs = REQUIRED_DOCS_BY_MODE[mode] ?? [];
  const uploadedDocTypes = new Set(docs.map((d) => d.doc_type as DocType));

  // Extract client from relation
  const clientRaw = entryCase.client_account;
  const clientObj = Array.isArray(clientRaw) ? clientRaw[0] : clientRaw;

  // Get approved classifications
  const approvedClassifications = (
    (metadata.approved_classifications as
      | { line_item_index: number; hts_code: string }[]
      | undefined) ?? []
  );

  // Extract line items from commercial invoices
  interface LineItemData {
    description: string;
    quantity?: number;
    unit_price?: number;
    total?: number;
    country_of_origin?: string;
    hs_code_hint?: string;
  }

  const lineItems: LineItemData[] = [];
  for (const doc of docs) {
    if (doc.doc_type === "commercial_invoice") {
      const extracted = (doc.extracted_data ?? {}) as {
        line_items?: LineItemData[];
      };
      if (extracted.line_items) {
        lineItems.push(...extracted.line_items);
      }
    }
  }

  // Filing history from metadata
  const filingHistory = (
    (metadata.filing_history as
      | {
          submitted_at: string;
          status: string;
          filing_id: string;
          provider: string;
        }[]
      | undefined) ?? []
  ).map((f) => ({
    submittedAt: f.submitted_at,
    status: f.status,
    filingId: f.filing_id,
    provider: f.provider,
  }));

  // Build checklist
  const checklist: ChecklistItem[] = [];

  // Document checks
  for (const reqDoc of requiredDocs) {
    const docLabel = reqDoc.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    checklist.push({
      label: docLabel,
      category: "documents",
      passed: uploadedDocTypes.has(reqDoc),
      detail: uploadedDocTypes.has(reqDoc)
        ? "Uploaded"
        : "Missing — required for this transport mode",
    });
  }

  // At least one doc must be parsed
  const parsedDocs = docs.filter((d) => d.parse_status === "completed");
  checklist.push({
    label: "At least one document parsed",
    category: "documents",
    passed: parsedDocs.length > 0,
    detail:
      parsedDocs.length > 0
        ? `${parsedDocs.length} document(s) parsed`
        : "No documents have been parsed yet",
  });

  // Classification checks
  const hasLineItems = lineItems.length > 0;
  checklist.push({
    label: "Line items extracted",
    category: "classifications",
    passed: hasLineItems,
    detail: hasLineItems
      ? `${lineItems.length} line item(s) found`
      : "Upload and parse a commercial invoice",
  });

  const allClassified =
    hasLineItems &&
    lineItems.every((_, i) =>
      approvedClassifications.some((c) => c.line_item_index === i)
    );
  checklist.push({
    label: "All line items classified (HTS approved)",
    category: "classifications",
    passed: allClassified,
    detail: allClassified
      ? `${approvedClassifications.length} classification(s) approved`
      : `${approvedClassifications.length}/${lineItems.length} approved`,
  });

  // Client info checks
  checklist.push({
    label: "Client account linked",
    category: "client_info",
    passed: !!clientObj,
    detail: clientObj ? clientObj.name : "No client linked",
  });

  const hasIOR = !!clientObj?.importer_of_record_number;
  checklist.push({
    label: "Importer of Record number",
    category: "client_info",
    passed: hasIOR,
    detail: hasIOR
      ? `IOR: ${clientObj.importer_of_record_number}`
      : "Missing — required for CBP filing",
  });

  // Case info checks
  checklist.push({
    label: "Transport mode set",
    category: "case_info",
    passed: !!entryCase.mode_of_transport,
    detail: entryCase.mode_of_transport ?? "Not set",
  });

  checklist.push({
    label: "ETA provided",
    category: "case_info",
    passed: !!entryCase.eta,
    detail: entryCase.eta ?? "Not set",
  });

  const allPassed = checklist.every((c) => c.passed);

  // Build packet
  const packet: FilingPacket = {
    caseId: entryCase.id,
    caseNumber: entryCase.case_number,
    status: entryCase.status,
    mode: entryCase.mode_of_transport,
    eta: entryCase.eta,
    actualArrival: entryCase.actual_arrival,
    priority: entryCase.priority,
    riskScore: entryCase.risk_score,
    client: clientObj
      ? {
          name: clientObj.name,
          importerOfRecordNumber: clientObj.importer_of_record_number,
          billingTerms: clientObj.billing_terms ?? {},
        }
      : null,
    classifications: approvedClassifications.map((c) => ({
      lineItemIndex: c.line_item_index,
      htsCode: c.hts_code,
    })),
    documents: docs.map((d) => ({
      id: d.id,
      docType: d.doc_type,
      fileName: d.file_name,
      parseStatus: d.parse_status,
      extractedData: d.extracted_data ?? {},
    })),
    lineItems: lineItems.map((li) => ({
      description: li.description,
      quantity: li.quantity,
      unitPrice: li.unit_price,
      total: li.total,
      countryOfOrigin: li.country_of_origin,
      hsCodeHint: li.hs_code_hint,
    })),
    filingHistory,
    generatedAt: new Date().toISOString(),
  };

  return NextResponse.json({
    ready: allPassed,
    checklist,
    missingItems: checklist.filter((c) => !c.passed).map((c) => c.label),
    packet,
  });
}
