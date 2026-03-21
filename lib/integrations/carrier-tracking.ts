/**
 * Carrier Tracking Integration
 *
 * Stub integration for tracking shipments across multiple carriers.
 * Returns mock data; in production this would call carrier APIs.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CarrierCode = "MAERSK" | "MSC" | "CMA_CGM" | "FEDEX" | "UPS" | "DHL";

export type TrackingEventType =
  | "booking_confirmed"
  | "container_gate_in"
  | "vessel_departed"
  | "transshipment"
  | "vessel_arrived"
  | "customs_clearance"
  | "container_gate_out"
  | "out_for_delivery"
  | "delivered"
  | "pickup"
  | "in_transit"
  | "exception";

export interface TrackingEvent {
  timestamp: string;
  event_type: TrackingEventType;
  description: string;
  location: string;
  vessel_name: string | null;
  voyage_number: string | null;
  container_number: string | null;
}

export interface ShipmentTracking {
  carrier: CarrierCode;
  tracking_number: string;
  status: string;
  current_location: string;
  origin: string;
  destination: string;
  eta: string | null;
  actual_arrival: string | null;
  events: TrackingEvent[];
  last_updated: string;
}

export interface TrackingTimelineEntry {
  date: string;
  time: string;
  event_type: TrackingEventType;
  description: string;
  location: string;
  is_current: boolean;
}

// ---------------------------------------------------------------------------
// Carrier definitions
// ---------------------------------------------------------------------------

export interface CarrierInfo {
  code: CarrierCode;
  name: string;
  type: "ocean" | "air" | "parcel";
}

export const CARRIERS: Record<CarrierCode, CarrierInfo> = {
  MAERSK: { code: "MAERSK", name: "Maersk", type: "ocean" },
  MSC: { code: "MSC", name: "Mediterranean Shipping Company", type: "ocean" },
  CMA_CGM: { code: "CMA_CGM", name: "CMA CGM", type: "ocean" },
  FEDEX: { code: "FEDEX", name: "FedEx", type: "parcel" },
  UPS: { code: "UPS", name: "UPS", type: "parcel" },
  DHL: { code: "DHL", name: "DHL", type: "air" },
};

// ---------------------------------------------------------------------------
// Event type display config
// ---------------------------------------------------------------------------

export const EVENT_TYPE_LABELS: Record<TrackingEventType, string> = {
  booking_confirmed: "Booking Confirmed",
  container_gate_in: "Container Gate In",
  vessel_departed: "Vessel Departed",
  transshipment: "Transshipment",
  vessel_arrived: "Vessel Arrived",
  customs_clearance: "Customs Clearance",
  container_gate_out: "Container Gate Out",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  pickup: "Picked Up",
  in_transit: "In Transit",
  exception: "Exception",
};

export const EVENT_TYPE_COLORS: Record<TrackingEventType, string> = {
  booking_confirmed: "bg-blue-100 text-blue-800",
  container_gate_in: "bg-blue-100 text-blue-800",
  vessel_departed: "bg-indigo-100 text-indigo-800",
  transshipment: "bg-purple-100 text-purple-800",
  vessel_arrived: "bg-green-100 text-green-800",
  customs_clearance: "bg-yellow-100 text-yellow-800",
  container_gate_out: "bg-green-100 text-green-800",
  out_for_delivery: "bg-yellow-100 text-yellow-800",
  delivered: "bg-green-100 text-green-800",
  pickup: "bg-blue-100 text-blue-800",
  in_transit: "bg-indigo-100 text-indigo-800",
  exception: "bg-red-100 text-red-800",
};

// ---------------------------------------------------------------------------
// Mock data generation
// ---------------------------------------------------------------------------

function generateOceanEvents(trackingNumber: string): TrackingEvent[] {
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;

  return [
    {
      timestamp: new Date(now.getTime() - 20 * dayMs).toISOString(),
      event_type: "booking_confirmed",
      description: "Booking confirmed with carrier",
      location: "Shanghai, China",
      vessel_name: "EVER GIVEN",
      voyage_number: "V.2024E",
      container_number: `MSCU${trackingNumber.slice(-7)}`,
    },
    {
      timestamp: new Date(now.getTime() - 18 * dayMs).toISOString(),
      event_type: "container_gate_in",
      description: "Container received at origin terminal",
      location: "Shanghai, China (CNSHA)",
      vessel_name: null,
      voyage_number: null,
      container_number: `MSCU${trackingNumber.slice(-7)}`,
    },
    {
      timestamp: new Date(now.getTime() - 15 * dayMs).toISOString(),
      event_type: "vessel_departed",
      description: "Vessel departed origin port",
      location: "Shanghai, China (CNSHA)",
      vessel_name: "EVER GIVEN",
      voyage_number: "V.2024E",
      container_number: `MSCU${trackingNumber.slice(-7)}`,
    },
    {
      timestamp: new Date(now.getTime() - 8 * dayMs).toISOString(),
      event_type: "transshipment",
      description: "Transshipment at intermediate port",
      location: "Busan, South Korea (KRPUS)",
      vessel_name: "EVER GIVEN",
      voyage_number: "V.2024E",
      container_number: `MSCU${trackingNumber.slice(-7)}`,
    },
    {
      timestamp: new Date(now.getTime() - 2 * dayMs).toISOString(),
      event_type: "vessel_arrived",
      description: "Vessel arrived at destination port",
      location: "Long Beach, CA (USLGB)",
      vessel_name: "EVER GIVEN",
      voyage_number: "V.2024E",
      container_number: `MSCU${trackingNumber.slice(-7)}`,
    },
    {
      timestamp: new Date(now.getTime() - 1 * dayMs).toISOString(),
      event_type: "customs_clearance",
      description: "Customs clearance in progress",
      location: "Long Beach, CA (USLGB)",
      vessel_name: null,
      voyage_number: null,
      container_number: `MSCU${trackingNumber.slice(-7)}`,
    },
  ];
}

function generateParcelEvents(trackingNumber: string): TrackingEvent[] {
  const now = new Date();
  const hourMs = 60 * 60 * 1000;

  return [
    {
      timestamp: new Date(now.getTime() - 72 * hourMs).toISOString(),
      event_type: "pickup",
      description: "Package picked up",
      location: "Shenzhen, China",
      vessel_name: null,
      voyage_number: null,
      container_number: null,
    },
    {
      timestamp: new Date(now.getTime() - 48 * hourMs).toISOString(),
      event_type: "in_transit",
      description: "In transit to destination country",
      location: "Hong Kong Hub",
      vessel_name: null,
      voyage_number: null,
      container_number: null,
    },
    {
      timestamp: new Date(now.getTime() - 24 * hourMs).toISOString(),
      event_type: "customs_clearance",
      description: "Customs clearance completed",
      location: "Memphis, TN",
      vessel_name: null,
      voyage_number: null,
      container_number: null,
    },
    {
      timestamp: new Date(now.getTime() - 6 * hourMs).toISOString(),
      event_type: "in_transit",
      description: "Package at local facility",
      location: "Los Angeles, CA",
      vessel_name: null,
      voyage_number: null,
      container_number: null,
    },
    {
      timestamp: new Date(now.getTime() - 2 * hourMs).toISOString(),
      event_type: "out_for_delivery",
      description: "Out for delivery",
      location: "Los Angeles, CA",
      vessel_name: null,
      voyage_number: null,
      container_number: null,
    },
  ];
}

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * Track a shipment by carrier and tracking number.
 * Returns mock tracking data (stub for carrier API integration).
 */
export function trackShipment(
  carrier: CarrierCode,
  trackingNumber: string,
): ShipmentTracking {
  const carrierInfo = CARRIERS[carrier];
  const isOcean = carrierInfo.type === "ocean";
  const events = isOcean
    ? generateOceanEvents(trackingNumber)
    : generateParcelEvents(trackingNumber);

  const lastEvent = events[events.length - 1];

  return {
    carrier,
    tracking_number: trackingNumber,
    status: lastEvent.description,
    current_location: lastEvent.location,
    origin: events[0].location,
    destination: isOcean ? "Long Beach, CA" : "Los Angeles, CA",
    eta: isOcean
      ? new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
      : new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    actual_arrival: null,
    events,
    last_updated: new Date().toISOString(),
  };
}

/**
 * Format tracking events into a display-ready timeline.
 */
export function getTrackingTimeline(events: TrackingEvent[]): TrackingTimelineEntry[] {
  const sorted = [...events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return sorted.map((event, index) => {
    const date = new Date(event.timestamp);
    return {
      date: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      time: date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      event_type: event.event_type,
      description: event.description,
      location: event.location,
      is_current: index === 0,
    };
  });
}
