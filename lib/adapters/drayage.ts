/**
 * Drayage / Trucking Adapter
 *
 * Dispatch order management, terminal appointment scheduling,
 * and driver communication logging for drayage operations.
 */

import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DispatchStatus =
  | "pending"
  | "dispatched"
  | "driver_assigned"
  | "en_route_pickup"
  | "at_terminal"
  | "loaded"
  | "en_route_delivery"
  | "delivered"
  | "cancelled";

export type AppointmentStatus = "requested" | "confirmed" | "checked_in" | "completed" | "missed" | "cancelled";

export type DriverCommType = "dispatch_sent" | "status_update" | "issue_report" | "eta_update" | "delivery_confirmation";

export interface DispatchOrder {
  id: string;
  case_id: string;
  dispatch_number: string;
  status: DispatchStatus;
  pickup_location: string;
  pickup_terminal: string;
  delivery_location: string;
  container_number: string;
  container_type: string;
  weight_kg: number;
  chassis_number: string;
  driver_name: string;
  driver_phone: string;
  truck_number: string;
  special_instructions: string;
  pickup_date: string | null;
  delivery_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface TruckingAppointment {
  id: string;
  dispatch_order_id: string;
  terminal: string;
  appointment_type: "pickup" | "delivery" | "empty_return";
  scheduled_date: string;
  scheduled_time: string;
  gate_code: string;
  status: AppointmentStatus;
  checked_in_at: string | null;
  completed_at: string | null;
  notes: string;
}

export interface DriverComm {
  id: string;
  dispatch_order_id: string;
  comm_type: DriverCommType;
  driver_name: string;
  message: string;
  location: string | null;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Dispatch state machine
// ---------------------------------------------------------------------------

export const DISPATCH_TRANSITIONS: Record<DispatchStatus, DispatchStatus[]> = {
  pending: ["dispatched", "cancelled"],
  dispatched: ["driver_assigned", "cancelled"],
  driver_assigned: ["en_route_pickup", "cancelled"],
  en_route_pickup: ["at_terminal"],
  at_terminal: ["loaded"],
  loaded: ["en_route_delivery"],
  en_route_delivery: ["delivered"],
  delivered: [],
  cancelled: [],
};

export function canTransitionDispatch(from: DispatchStatus, to: DispatchStatus): boolean {
  return DISPATCH_TRANSITIONS[from].includes(to);
}

export const DISPATCH_STATUS_COLORS: Record<DispatchStatus, string> = {
  pending: "bg-gray-100 text-gray-800",
  dispatched: "bg-blue-100 text-blue-800",
  driver_assigned: "bg-blue-100 text-blue-800",
  en_route_pickup: "bg-yellow-100 text-yellow-800",
  at_terminal: "bg-purple-100 text-purple-800",
  loaded: "bg-indigo-100 text-indigo-800",
  en_route_delivery: "bg-yellow-100 text-yellow-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export const APPOINTMENT_STATUS_COLORS: Record<AppointmentStatus, string> = {
  requested: "bg-gray-100 text-gray-800",
  confirmed: "bg-blue-100 text-blue-800",
  checked_in: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
  missed: "bg-red-100 text-red-800",
  cancelled: "bg-red-100 text-red-800",
};

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

function generateDispatchNumber(): string {
  const prefix = "DSP";
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}-${ts}-${rand}`;
}

/**
 * Create a dispatch order from case data.
 */
export async function createDispatchOrder(caseId: string): Promise<DispatchOrder> {
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

  const blDoc = (docs ?? []).find((d) => d.doc_type === "bill_of_lading");
  const blData = (blDoc?.extracted_data ?? {}) as Record<string, unknown>;

  const containerNumbers = (blData.container_numbers as string[]) ?? [];

  const dispatch: DispatchOrder = {
    id: crypto.randomUUID(),
    case_id: caseId,
    dispatch_number: generateDispatchNumber(),
    status: "pending",
    pickup_location: (blData.port_of_discharge as string) ?? "",
    pickup_terminal: (blData.terminal as string) ?? "",
    delivery_location: "",
    container_number: containerNumbers[0] ?? "",
    container_type: (blData.container_type as string) ?? "40GP",
    weight_kg: (blData.total_weight_kg as number) ?? 0,
    chassis_number: "",
    driver_name: "",
    driver_phone: "",
    truck_number: "",
    special_instructions: "",
    pickup_date: entryCase.actual_arrival ?? entryCase.eta,
    delivery_date: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return dispatch;
}

/**
 * Format a dispatch status for display.
 */
export function formatDispatchStatus(status: DispatchStatus): string {
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
