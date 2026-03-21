/**
 * Freight Forwarding Adapter
 *
 * Booking requests, consolidation tracking, and BL workflow
 * state machine for freight forwarding operations.
 */

import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BookingStatus = "draft" | "requested" | "confirmed" | "amended" | "cancelled";

export type BLStatus =
  | "pending_draft"
  | "draft_received"
  | "under_review"
  | "corrections_requested"
  | "approved"
  | "surrendered"
  | "released";

export type ConsolidationStatus = "planning" | "booking" | "loading" | "in_transit" | "delivered";

export interface BookingRequest {
  id: string;
  case_id: string;
  carrier: string;
  service_type: "FCL" | "LCL" | "breakbulk";
  origin_port: string;
  destination_port: string;
  commodity_description: string;
  container_type: string;
  container_count: number;
  weight_kg: number;
  volume_cbm: number;
  requested_etd: string | null;
  confirmed_etd: string | null;
  confirmed_eta: string | null;
  booking_number: string | null;
  vessel_name: string | null;
  voyage_number: string | null;
  status: BookingStatus;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Consolidation {
  id: string;
  consolidation_number: string;
  container_number: string;
  container_type: string;
  origin_port: string;
  destination_port: string;
  shipment_ids: string[];
  total_weight_kg: number;
  total_volume_cbm: number;
  capacity_used_pct: number;
  status: ConsolidationStatus;
  carrier: string;
  etd: string | null;
  eta: string | null;
  created_at: string;
}

export interface BLWorkflow {
  case_id: string;
  bl_number: string;
  bl_type: "original" | "telex_release" | "seaway_bill" | "express";
  status: BLStatus;
  carrier: string;
  shipper: string;
  consignee: string;
  notify_party: string;
  corrections: BLCorrection[];
  history: BLHistoryEntry[];
}

export interface BLCorrection {
  field: string;
  original_value: string;
  corrected_value: string;
  requested_at: string;
  resolved_at: string | null;
}

export interface BLHistoryEntry {
  from_status: BLStatus;
  to_status: BLStatus;
  changed_at: string;
  changed_by: string;
  notes: string;
}

// ---------------------------------------------------------------------------
// BL Workflow State Machine
// ---------------------------------------------------------------------------

export const BL_VALID_TRANSITIONS: Record<BLStatus, BLStatus[]> = {
  pending_draft: ["draft_received"],
  draft_received: ["under_review"],
  under_review: ["corrections_requested", "approved"],
  corrections_requested: ["draft_received"],
  approved: ["surrendered"],
  surrendered: ["released"],
  released: [],
};

export function canTransitionBL(from: BLStatus, to: BLStatus): boolean {
  return BL_VALID_TRANSITIONS[from].includes(to);
}

// ---------------------------------------------------------------------------
// Container types
// ---------------------------------------------------------------------------

export const CONTAINER_TYPES = [
  { code: "20GP", label: "20' Standard", teu: 1 },
  { code: "40GP", label: "40' Standard", teu: 2 },
  { code: "40HC", label: "40' High Cube", teu: 2 },
  { code: "20RF", label: "20' Reefer", teu: 1 },
  { code: "40RF", label: "40' Reefer", teu: 2 },
  { code: "20OT", label: "20' Open Top", teu: 1 },
  { code: "40OT", label: "40' Open Top", teu: 2 },
  { code: "20FR", label: "20' Flat Rack", teu: 1 },
  { code: "40FR", label: "40' Flat Rack", teu: 2 },
] as const;

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * Create a booking request from case data.
 */
export async function createBookingRequest(caseId: string): Promise<BookingRequest> {
  const supabase = await createClient();

  const { data: entryCase } = await supabase
    .from("entry_cases")
    .select("*, client_account:client_accounts(name)")
    .eq("id", caseId)
    .single();

  if (!entryCase) throw new Error(`Case ${caseId} not found`);

  const { data: docs } = await supabase
    .from("documents")
    .select("doc_type, extracted_data")
    .eq("entry_case_id", caseId)
    .eq("parse_status", "completed");

  const invoiceDoc = (docs ?? []).find((d) => d.doc_type === "commercial_invoice");
  const invoiceData = (invoiceDoc?.extracted_data ?? {}) as Record<string, unknown>;

  const booking: BookingRequest = {
    id: crypto.randomUUID(),
    case_id: caseId,
    carrier: "",
    service_type: "FCL",
    origin_port: (invoiceData.port_of_loading as string) ?? "",
    destination_port: (invoiceData.port_of_discharge as string) ?? "",
    commodity_description: (invoiceData.commodity_description as string) ?? "",
    container_type: "40GP",
    container_count: 1,
    weight_kg: (invoiceData.total_weight_kg as number) ?? 0,
    volume_cbm: (invoiceData.total_volume_cbm as number) ?? 0,
    requested_etd: null,
    confirmed_etd: null,
    confirmed_eta: entryCase.eta,
    booking_number: null,
    vessel_name: null,
    voyage_number: null,
    status: "draft",
    notes: "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return booking;
}

/**
 * Calculate consolidation capacity utilization.
 */
export function calculateCapacity(
  totalVolumeCbm: number,
  containerType: string,
): number {
  const capacities: Record<string, number> = {
    "20GP": 33,
    "40GP": 67,
    "40HC": 76,
    "20RF": 28,
    "40RF": 60,
    "20OT": 32,
    "40OT": 65,
    "20FR": 28,
    "40FR": 56,
  };
  const max = capacities[containerType] ?? 67;
  return Math.min(100, Math.round((totalVolumeCbm / max) * 100));
}
