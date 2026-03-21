import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { determinePGARequirements } from "@/lib/adapters/pga";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = createClient();

    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: entryCase } = await supabase
      .from("entry_cases")
      .select("metadata")
      .eq("id", params.id)
      .single();

    if (!entryCase) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    const metadata = (entryCase.metadata ?? {}) as Record<string, unknown>;
    const approvedClassifications = (metadata.approved_classifications ?? []) as {
      line_item_index: number;
      hts_code: string;
    }[];

    // Fetch documents for commodity descriptions
    const { data: docs } = await supabase
      .from("documents")
      .select("doc_type, extracted_data")
      .eq("entry_case_id", params.id)
      .eq("parse_status", "completed");

    const invoiceDoc = (docs ?? []).find((d) => d.doc_type === "commercial_invoice");
    const invoiceData = (invoiceDoc?.extracted_data ?? {}) as Record<string, unknown>;
    const commodityDescription = (invoiceData.commodity_description as string) ?? "";

    const htsCodes = approvedClassifications.map((c) => c.hts_code);

    // Determine PGA requirements for each HTS code
    const allRequirements = new Map<string, ReturnType<typeof determinePGARequirements>[number]>();

    for (const htsCode of htsCodes) {
      const reqs = determinePGARequirements(commodityDescription, htsCode);
      for (const req of reqs) {
        if (!allRequirements.has(req.agency.code)) {
          allRequirements.set(req.agency.code, req);
        }
      }
    }

    // If no HTS codes, still check by commodity description
    if (htsCodes.length === 0 && commodityDescription) {
      const reqs = determinePGARequirements(commodityDescription, "");
      for (const req of reqs) {
        if (!allRequirements.has(req.agency.code)) {
          allRequirements.set(req.agency.code, req);
        }
      }
    }

    return NextResponse.json({
      requirements: Array.from(allRequirements.values()),
      total_agencies: allRequirements.size,
      hts_codes_checked: htsCodes,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to check PGA requirements";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
