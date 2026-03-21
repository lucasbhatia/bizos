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
  Truck,
  MapPin,
  Phone,
  Clock,
  ArrowRight,
  MessageSquare,
} from "lucide-react";
import type {
  DispatchOrder,
  TruckingAppointment,
  DriverComm,
  DispatchStatus,
  AppointmentStatus,
} from "@/lib/adapters/drayage";

interface CaseDrayageProps {
  caseId: string;
}

interface DrayageResponse {
  dispatch: DispatchOrder;
  appointments: TruckingAppointment[];
  communications: DriverComm[];
}

const DISPATCH_STATUS_COLORS: Record<DispatchStatus, string> = {
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

const APPOINTMENT_STATUS_COLORS: Record<AppointmentStatus, string> = {
  requested: "bg-gray-100 text-gray-800",
  confirmed: "bg-blue-100 text-blue-800",
  checked_in: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
  missed: "bg-red-100 text-red-800",
  cancelled: "bg-red-100 text-red-800",
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

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const COMM_TYPE_LABELS: Record<string, string> = {
  dispatch_sent: "Dispatch Sent",
  status_update: "Status Update",
  issue_report: "Issue Report",
  eta_update: "ETA Update",
  delivery_confirmation: "Delivery Confirmed",
};

export function CaseDrayage({ caseId }: CaseDrayageProps) {
  const [loading, setLoading] = useState(false);
  const [drayageData, setDrayageData] = useState<DrayageResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadDrayage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/cases/${caseId}/drayage`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error ?? "Failed to load drayage data");
      }
      const data: DrayageResponse = await res.json();
      setDrayageData(data);
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
          <Truck className="h-5 w-5 text-blue-600" />
          <h3 className="text-sm font-medium">Drayage / Trucking</h3>
        </div>
        <Button onClick={loadDrayage} disabled={loading} size="sm">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-1" />
          )}
          {drayageData ? "Refresh" : "Load Drayage Data"}
        </Button>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>
      )}

      {!drayageData && !loading && !error && (
        <Card>
          <CardContent className="py-8 text-center text-slate-500 text-sm">
            Click &quot;Load Drayage Data&quot; to view dispatch orders,
            appointments, and driver communications.
          </CardContent>
        </Card>
      )}

      {drayageData && (
        <>
          {/* Dispatch Order */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Dispatch Order</CardTitle>
                <Badge className={DISPATCH_STATUS_COLORS[drayageData.dispatch.status]}>
                  {formatStatus(drayageData.dispatch.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Dispatch #:</span>{" "}
                  <span className="font-mono font-medium">{drayageData.dispatch.dispatch_number}</span>
                </div>
                <div>
                  <span className="text-slate-500">Container:</span>{" "}
                  <span className="font-mono font-medium">
                    {drayageData.dispatch.container_number || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Container Type:</span>{" "}
                  <span className="font-medium">{drayageData.dispatch.container_type}</span>
                </div>
                <div>
                  <span className="text-slate-500">Weight:</span>{" "}
                  <span className="font-medium">
                    {drayageData.dispatch.weight_kg > 0
                      ? `${drayageData.dispatch.weight_kg.toLocaleString()} kg`
                      : "N/A"}
                  </span>
                </div>
              </div>

              {/* Route */}
              <div className="flex items-center gap-3 py-3 px-3 bg-slate-50 rounded text-sm">
                <div className="text-center flex-1">
                  <div className="flex items-center gap-1 justify-center text-slate-500 mb-1">
                    <MapPin className="h-3 w-3" />
                    <span className="text-xs">Pickup</span>
                  </div>
                  <p className="font-medium">{drayageData.dispatch.pickup_terminal || "TBD"}</p>
                  <p className="text-xs text-slate-500">{drayageData.dispatch.pickup_location || ""}</p>
                  <p className="text-xs text-slate-400">{formatDate(drayageData.dispatch.pickup_date)}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
                <div className="text-center flex-1">
                  <div className="flex items-center gap-1 justify-center text-slate-500 mb-1">
                    <MapPin className="h-3 w-3" />
                    <span className="text-xs">Delivery</span>
                  </div>
                  <p className="font-medium">{drayageData.dispatch.delivery_location || "TBD"}</p>
                  <p className="text-xs text-slate-400">{formatDate(drayageData.dispatch.delivery_date)}</p>
                </div>
              </div>

              {/* Driver info */}
              <div className="rounded border p-3 space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Driver Assignment
                </p>
                {drayageData.dispatch.driver_name ? (
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Truck className="h-3.5 w-3.5 text-slate-400" />
                      <span>{drayageData.dispatch.driver_name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      <span>{drayageData.dispatch.driver_phone || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Truck:</span>{" "}
                      <span className="font-medium">{drayageData.dispatch.truck_number || "N/A"}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">No driver assigned</p>
                )}
                {drayageData.dispatch.chassis_number && (
                  <div className="text-sm">
                    <span className="text-slate-500">Chassis:</span>{" "}
                    <span className="font-mono">{drayageData.dispatch.chassis_number}</span>
                  </div>
                )}
              </div>

              {drayageData.dispatch.special_instructions && (
                <div className="text-sm bg-yellow-50 p-3 rounded">
                  <span className="font-medium">Special Instructions: </span>
                  {drayageData.dispatch.special_instructions}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Appointments */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-500" />
                <CardTitle className="text-base">
                  Terminal Appointments ({drayageData.appointments.length})
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {drayageData.appointments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Terminal</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Gate</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drayageData.appointments.map((appt) => (
                      <TableRow key={appt.id}>
                        <TableCell className="text-sm font-medium">{appt.terminal}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs capitalize">
                            {appt.appointment_type.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{appt.scheduled_date}</TableCell>
                        <TableCell className="text-sm">{appt.scheduled_time}</TableCell>
                        <TableCell className="text-sm font-mono">{appt.gate_code || "N/A"}</TableCell>
                        <TableCell>
                          <Badge className={APPOINTMENT_STATUS_COLORS[appt.status]}>
                            {formatStatus(appt.status)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-slate-400 text-center py-4">
                  No terminal appointments scheduled.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Driver Communications */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-slate-500" />
                <CardTitle className="text-base">
                  Driver Communications ({drayageData.communications.length})
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {drayageData.communications.length > 0 ? (
                <div className="space-y-3">
                  {drayageData.communications.map((comm) => (
                    <div key={comm.id} className="flex gap-3 text-sm border-b pb-3 last:border-0 last:pb-0">
                      <div className="w-28 shrink-0 text-xs text-slate-400">
                        {formatDateTime(comm.timestamp)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className="text-xs">
                            {COMM_TYPE_LABELS[comm.comm_type] ?? comm.comm_type}
                          </Badge>
                          <span className="text-xs text-slate-500">{comm.driver_name}</span>
                        </div>
                        <p className="text-sm text-slate-700">{comm.message}</p>
                        {comm.location && (
                          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {comm.location}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-4">
                  No driver communications logged.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
