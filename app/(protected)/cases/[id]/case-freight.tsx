"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  RefreshCw,
  Anchor,
  Package,
  ArrowRight,
} from "lucide-react";
import type { BookingRequest, BLWorkflow, Consolidation, BLStatus } from "@/lib/adapters/freight";

interface CaseFreightProps {
  caseId: string;
}

interface FreightResponse {
  booking: BookingRequest;
  bl_workflow: BLWorkflow | null;
  consolidations: Consolidation[];
}

const BOOKING_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  requested: "bg-blue-100 text-blue-800",
  confirmed: "bg-green-100 text-green-800",
  amended: "bg-yellow-100 text-yellow-800",
  cancelled: "bg-red-100 text-red-800",
};

const BL_STATUS_COLORS: Record<BLStatus, string> = {
  pending_draft: "bg-gray-100 text-gray-800",
  draft_received: "bg-blue-100 text-blue-800",
  under_review: "bg-yellow-100 text-yellow-800",
  corrections_requested: "bg-orange-100 text-orange-800",
  approved: "bg-green-100 text-green-800",
  surrendered: "bg-purple-100 text-purple-800",
  released: "bg-green-100 text-green-800",
};

function formatStatus(status: string): string {
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function CaseFreight({ caseId }: CaseFreightProps) {
  const [loading, setLoading] = useState(false);
  const [freightData, setFreightData] = useState<FreightResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadFreight = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/cases/${caseId}/freight`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error ?? "Failed to load freight data");
      }
      const data: FreightResponse = await res.json();
      setFreightData(data);
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
          <Anchor className="h-5 w-5 text-blue-600" />
          <h3 className="text-sm font-medium">Freight Forwarding</h3>
        </div>
        <Button onClick={loadFreight} disabled={loading} size="sm">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-1" />
          )}
          {freightData ? "Refresh" : "Load Freight Data"}
        </Button>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>
      )}

      {!freightData && !loading && !error && (
        <Card>
          <CardContent className="py-8 text-center text-slate-500 text-sm">
            Click &quot;Load Freight Data&quot; to view booking, container,
            and BL workflow information.
          </CardContent>
        </Card>
      )}

      {freightData && (
        <>
          {/* Booking Details */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Booking Details</CardTitle>
                <Badge className={BOOKING_STATUS_COLORS[freightData.booking.status] ?? "bg-gray-100 text-gray-800"}>
                  {formatStatus(freightData.booking.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Booking #:</span>{" "}
                  <span className="font-mono font-medium">
                    {freightData.booking.booking_number ?? "Pending"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Service:</span>{" "}
                  <span className="font-medium">{freightData.booking.service_type}</span>
                </div>
                <div>
                  <span className="text-slate-500">Carrier:</span>{" "}
                  <span className="font-medium">{freightData.booking.carrier || "Not assigned"}</span>
                </div>
                <div>
                  <span className="text-slate-500">Container:</span>{" "}
                  <span className="font-medium">
                    {freightData.booking.container_count}x {freightData.booking.container_type}
                  </span>
                </div>
              </div>

              {/* Route */}
              <div className="flex items-center gap-3 py-2 px-3 bg-slate-50 rounded text-sm">
                <div className="text-center">
                  <p className="text-xs text-slate-500">Origin</p>
                  <p className="font-medium">{freightData.booking.origin_port || "TBD"}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
                <div className="text-center">
                  <p className="text-xs text-slate-500">Destination</p>
                  <p className="font-medium">{freightData.booking.destination_port || "TBD"}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Weight:</span>{" "}
                  <span className="font-medium">
                    {freightData.booking.weight_kg > 0
                      ? `${freightData.booking.weight_kg.toLocaleString()} kg`
                      : "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Volume:</span>{" "}
                  <span className="font-medium">
                    {freightData.booking.volume_cbm > 0
                      ? `${freightData.booking.volume_cbm} CBM`
                      : "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">ETA:</span>{" "}
                  <span className="font-medium">{formatDate(freightData.booking.confirmed_eta)}</span>
                </div>
              </div>

              {freightData.booking.vessel_name && (
                <div className="text-sm">
                  <span className="text-slate-500">Vessel:</span>{" "}
                  <span className="font-medium">
                    {freightData.booking.vessel_name}
                    {freightData.booking.voyage_number && ` / ${freightData.booking.voyage_number}`}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* BL Workflow */}
          {freightData.bl_workflow && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Bill of Lading Workflow</CardTitle>
                  <Badge className={BL_STATUS_COLORS[freightData.bl_workflow.status]}>
                    {formatStatus(freightData.bl_workflow.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">BL #:</span>{" "}
                    <span className="font-mono font-medium">{freightData.bl_workflow.bl_number || "Pending"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Type:</span>{" "}
                    <span className="font-medium capitalize">
                      {freightData.bl_workflow.bl_type.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Shipper:</span>{" "}
                    <span className="font-medium">{freightData.bl_workflow.shipper || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Consignee:</span>{" "}
                    <span className="font-medium">{freightData.bl_workflow.consignee || "N/A"}</span>
                  </div>
                </div>

                {/* BL History */}
                {freightData.bl_workflow.history.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      Status History
                    </p>
                    <div className="space-y-1">
                      {freightData.bl_workflow.history.map((entry, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span className="text-slate-400 w-32 shrink-0">
                            {new Date(entry.changed_at).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {formatStatus(entry.from_status)}
                          </Badge>
                          <ArrowRight className="h-3 w-3 text-slate-400" />
                          <Badge variant="secondary" className="text-xs">
                            {formatStatus(entry.to_status)}
                          </Badge>
                          {entry.notes && (
                            <span className="text-slate-500 truncate">{entry.notes}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* BL Corrections */}
                {freightData.bl_workflow.corrections.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      Corrections
                    </p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Field</TableHead>
                          <TableHead>Original</TableHead>
                          <TableHead>Corrected</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {freightData.bl_workflow.corrections.map((c, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-sm font-medium">{c.field}</TableCell>
                            <TableCell className="text-sm text-red-600 line-through">{c.original_value}</TableCell>
                            <TableCell className="text-sm text-green-700">{c.corrected_value}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs">
                                {c.resolved_at ? "Resolved" : "Pending"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Consolidations */}
          {freightData.consolidations.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-slate-500" />
                  <CardTitle className="text-base">Consolidations</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Consol #</TableHead>
                      <TableHead>Container</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {freightData.consolidations.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono text-sm">{c.consolidation_number}</TableCell>
                        <TableCell className="font-mono text-sm">{c.container_number}</TableCell>
                        <TableCell className="text-sm">
                          {c.origin_port} → {c.destination_port}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${c.capacity_used_pct}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-500">{c.capacity_used_pct}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs capitalize">
                            {formatStatus(c.status)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
