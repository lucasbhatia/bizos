"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  RefreshCw,
  MapPin,
  Clock,
  Navigation,
  Ship,
  Package,
} from "lucide-react";
import type {
  ShipmentTracking,
  TrackingTimelineEntry,
  TrackingEventType,
} from "@/lib/integrations/carrier-tracking";

interface CaseTrackingProps {
  caseId: string;
}

interface TrackingResponse {
  tracking: ShipmentTracking;
  timeline: TrackingTimelineEntry[];
}

const EVENT_TYPE_COLORS: Record<TrackingEventType, string> = {
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

const EVENT_TYPE_LABELS: Record<TrackingEventType, string> = {
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

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CaseTracking({ caseId }: CaseTrackingProps) {
  const [loading, setLoading] = useState(false);
  const [trackingData, setTrackingData] = useState<TrackingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadTracking = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/cases/${caseId}/tracking`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error ?? "Failed to load tracking data");
      }
      const data: TrackingResponse = await res.json();
      setTrackingData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Navigation className="h-5 w-5 text-blue-600" />
          <h3 className="text-sm font-medium">Carrier Tracking</h3>
        </div>
        <Button onClick={loadTracking} disabled={loading} size="sm">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-1" />
          )}
          {trackingData ? "Refresh" : "Track Shipment"}
        </Button>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>
      )}

      {!trackingData && !loading && !error && (
        <Card>
          <CardContent className="py-8 text-center text-slate-500 text-sm">
            Click &quot;Track Shipment&quot; to view real-time tracking
            information and shipment timeline.
          </CardContent>
        </Card>
      )}

      {trackingData && (
        <>
          {/* Status overview */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-slate-500 mb-1">Carrier</p>
                <div className="flex items-center gap-1.5">
                  <Ship className="h-4 w-4 text-slate-600" />
                  <span className="text-sm font-medium">{trackingData.tracking.carrier.replace(/_/g, " ")}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-slate-500 mb-1">Current Status</p>
                <p className="text-sm font-medium">{trackingData.tracking.status}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-slate-500 mb-1">Current Location</p>
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-slate-600" />
                  <span className="text-sm font-medium">{trackingData.tracking.current_location}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-slate-500 mb-1">ETA</p>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-slate-600" />
                  <span className="text-sm font-medium">{formatDate(trackingData.tracking.eta)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Route summary */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between text-sm">
                <div className="text-center">
                  <p className="text-xs text-slate-500">Origin</p>
                  <p className="font-medium">{trackingData.tracking.origin}</p>
                </div>
                <div className="flex-1 mx-4 relative">
                  <div className="h-0.5 bg-slate-200 w-full" />
                  <div
                    className="h-0.5 bg-blue-600 absolute top-0 left-0"
                    style={{
                      width: `${Math.min(100, (trackingData.timeline.length > 0 ? ((trackingData.tracking.events.length) / (trackingData.tracking.events.length + 2)) * 100 : 0))}%`,
                    }}
                  />
                  <Package className="h-4 w-4 text-blue-600 absolute -top-1.5 bg-white"
                    style={{
                      left: `${Math.min(95, (trackingData.tracking.events.length / (trackingData.tracking.events.length + 2)) * 100)}%`,
                    }}
                  />
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500">Destination</p>
                  <p className="font-medium">{trackingData.tracking.destination}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tracking number */}
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center justify-between">
              <div className="text-sm">
                <span className="text-slate-500">Tracking Number: </span>
                <span className="font-mono font-medium">{trackingData.tracking.tracking_number}</span>
              </div>
              <div className="text-xs text-slate-400">
                Last updated: {formatDate(trackingData.tracking.last_updated)}
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Tracking Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />

                <div className="space-y-4">
                  {trackingData.timeline.map((entry, i) => (
                    <div key={i} className="relative flex gap-4 pl-10">
                      {/* Dot */}
                      <div
                        className={`absolute left-2.5 w-3 h-3 rounded-full border-2 ${
                          entry.is_current
                            ? "bg-blue-600 border-blue-600"
                            : "bg-white border-slate-300"
                        }`}
                      />

                      <div className="flex-1 pb-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={EVENT_TYPE_COLORS[entry.event_type]}>
                            {EVENT_TYPE_LABELS[entry.event_type]}
                          </Badge>
                          {entry.is_current && (
                            <Badge className="bg-blue-600 text-white text-xs">Current</Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-700 mt-1">{entry.description}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span>{entry.location}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{entry.date} {entry.time}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
