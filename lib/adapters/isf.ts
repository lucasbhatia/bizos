/**
 * ISF (Importer Security Filing / 10+2) Adapter
 *
 * Handles ISF data assembly, validation, and deadline calculation
 * for ocean shipments entering the United States.
 */

import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ISFParty {
  name: string;
  address: string;
  city: string;
  country: string;
  id_number: string | null;
}

export interface ISFData {
  case_id: string;
  bill_of_lading: string;
  importer: ISFParty;
  seller: ISFParty;
  buyer: ISFParty;
  manufacturer: ISFParty;
  ship_to: ISFParty;
  container_stuffing_location: ISFParty;
  consolidator: ISFParty;
  country_of_origin: string;
  hs_codes: string[];
  container_numbers: string[];
  eta: string | null;
  vessel_name: string | null;
  voyage_number: string | null;
  filing_deadline: string | null;
  status: ISFStatus;
  validated_at: string | null;
}

export type ISFStatus = "draft" | "validated" | "submitted" | "accepted" | "rejected";

export interface ISFValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EMPTY_PARTY: ISFParty = {
  name: "",
  address: "",
  city: "",
  country: "",
  id_number: null,
};

function extractParty(data: Record<string, unknown>, prefix: string): ISFParty {
  return {
    name: (data[`${prefix}_name`] as string) ?? "",
    address: (data[`${prefix}_address`] as string) ?? "",
    city: (data[`${prefix}_city`] as string) ?? "",
    country: (data[`${prefix}_country`] as string) ?? "",
    id_number: (data[`${prefix}_id`] as string) ?? null,
  };
}

function isPartyComplete(party: ISFParty): boolean {
  return party.name.length > 0 && party.address.length > 0 && party.country.length > 0;
}

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * ISF must be filed at least 24 hours before vessel loading at the foreign port.
 * As a practical rule, brokers target 72 hours before ETA to the US port.
 */
export function calculateDeadline(eta: string | null): string | null {
  if (!eta) return null;
  const etaDate = new Date(eta);
  if (isNaN(etaDate.getTime())) return null;
  // 24 hours before vessel loading -- approximate as 72h before US ETA
  const deadline = new Date(etaDate.getTime() - 72 * 60 * 60 * 1000);
  return deadline.toISOString();
}

/**
 * Calculate hours remaining until ISF deadline.
 */
export function hoursUntilDeadline(deadline: string | null): number | null {
  if (!deadline) return null;
  const deadlineDate = new Date(deadline);
  if (isNaN(deadlineDate.getTime())) return null;
  const now = new Date();
  return Math.max(0, (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60));
}

/**
 * Validate ISF data completeness per CBP requirements.
 */
export function validateISF(data: ISFData): ISFValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required parties (10 data elements from importer)
  if (!isPartyComplete(data.importer)) errors.push("Importer information is incomplete");
  if (!isPartyComplete(data.seller)) errors.push("Seller information is incomplete");
  if (!isPartyComplete(data.buyer)) errors.push("Buyer information is incomplete");
  if (!isPartyComplete(data.manufacturer)) errors.push("Manufacturer information is incomplete");
  if (!isPartyComplete(data.ship_to)) errors.push("Ship-to party information is incomplete");
  if (!isPartyComplete(data.container_stuffing_location)) errors.push("Container stuffing location is incomplete");
  if (!isPartyComplete(data.consolidator)) errors.push("Consolidator information is incomplete");

  // Required fields
  if (!data.bill_of_lading) errors.push("Bill of lading number is required");
  if (!data.country_of_origin) errors.push("Country of origin is required");
  if (data.hs_codes.length === 0) errors.push("At least one HS code is required");
  if (data.container_numbers.length === 0) warnings.push("No container numbers provided");

  // HS code format validation
  for (const code of data.hs_codes) {
    if (!/^\d{6,10}$/.test(code.replace(/\./g, ""))) {
      errors.push(`Invalid HS code format: ${code}`);
    }
  }

  // Deadline warnings
  const hours = hoursUntilDeadline(data.filing_deadline);
  if (hours !== null && hours < 24) {
    warnings.push(`Filing deadline is in ${Math.round(hours)} hours -- urgent`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Assemble ISF data from case documents and metadata.
 */
export async function buildISFFromCase(caseId: string): Promise<ISFData> {
  const supabase = createClient();

  const { data: entryCase } = await supabase
    .from("entry_cases")
    .select("*, client_account:client_accounts(*)")
    .eq("id", caseId)
    .single();

  if (!entryCase) {
    throw new Error(`Case ${caseId} not found`);
  }

  // Fetch documents for extracted data
  const { data: documents } = await supabase
    .from("documents")
    .select("doc_type, extracted_data")
    .eq("entry_case_id", caseId)
    .eq("parse_status", "completed");

  const docs = documents ?? [];
  const metadata = (entryCase.metadata ?? {}) as Record<string, unknown>;

  // Extract BL data
  const blDoc = docs.find((d) => d.doc_type === "bill_of_lading");
  const blData = (blDoc?.extracted_data ?? {}) as Record<string, unknown>;

  // Extract invoice data for HS codes
  const invoiceDoc = docs.find((d) => d.doc_type === "commercial_invoice");
  const invoiceData = (invoiceDoc?.extracted_data ?? {}) as Record<string, unknown>;

  // Build classifications from approved classifications
  const approvedClassifications = (metadata.approved_classifications ?? []) as {
    line_item_index: number;
    hts_code: string;
  }[];
  const hsCodes = approvedClassifications.map((c) => c.hts_code);

  // Get client info
  const client = Array.isArray(entryCase.client_account)
    ? entryCase.client_account[0]
    : entryCase.client_account;
  const clientData = (client ?? {}) as Record<string, unknown>;

  const isf: ISFData = {
    case_id: caseId,
    bill_of_lading: (blData.bl_number as string) ?? "",
    importer: {
      name: (clientData.name as string) ?? "",
      address: "",
      city: "",
      country: "US",
      id_number: (clientData.importer_of_record_number as string) ?? null,
    },
    seller: extractParty(invoiceData, "seller"),
    buyer: extractParty(invoiceData, "buyer"),
    manufacturer: extractParty(invoiceData, "manufacturer"),
    ship_to: { ...EMPTY_PARTY, country: "US" },
    container_stuffing_location: extractParty(blData, "stuffing_location"),
    consolidator: extractParty(blData, "consolidator"),
    country_of_origin: (invoiceData.country_of_origin as string) ?? "",
    hs_codes: hsCodes,
    container_numbers: (blData.container_numbers as string[]) ?? [],
    eta: entryCase.eta,
    vessel_name: (blData.vessel_name as string) ?? null,
    voyage_number: (blData.voyage_number as string) ?? null,
    filing_deadline: calculateDeadline(entryCase.eta),
    status: "draft",
    validated_at: null,
  };

  return isf;
}
