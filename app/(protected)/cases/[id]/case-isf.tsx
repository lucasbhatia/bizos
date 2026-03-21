"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  AlertTriangle,
  Send,
  RefreshCw,
  Ship,
} from "lucide-react";
import type { ISFData, ISFValidationResult } from "@/lib/adapters/isf";

interface CaseISFProps {
  caseId: string;
  eta: string | null;
}

interface ISFResponse {
  isf: ISFData;
  validation: ISFValidationResult;
}

function formatDeadline(deadline: string | null): string {
  if (!deadline) return "N/A";
  return new Date(deadline).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DeadlineCountdown({ deadline }: { deadline: string | null }) {
  const [remaining, setRemaining] = useState<string>("--");
  const [urgency, setUrgency] = useState<"safe" | "warning" | "critical">("safe");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!deadline) return;

    function update() {
      const now = new Date().getTime();
      const target = new Date(deadline as string).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setRemaining("OVERDUE");
        setUrgency("critical");
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours < 24) {
        setUrgency("critical");
      } else if (hours < 48) {
        setUrgency("warning");
      } else {
        setUrgency("safe");
      }

      setRemaining(`${hours}h ${minutes}m`);
    }

    update();
    intervalRef.current = setInterval(update, 60000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [deadline]);

  const colorMap = {
    safe: "text-green-600",
    warning: "text-yellow-600",
    critical: "text-red-600",
  };

  return (
    <div className="flex items-center gap-2">
      <Clock className={`h-4 w-4 ${colorMap[urgency]}`} />
      <span className={`text-lg font-bold ${colorMap[urgency]}`}>{remaining}</span>
    </div>
  );
}

function PartyCard({
  label,
  party,
}: {
  label: string;
  party: { name: string; address: string; city: string; country: string; id_number: string | null };
}) {
  const complete = party.name.length > 0 && party.address.length > 0 && party.country.length > 0;
  return (
    <div className="rounded border p-3 space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500 uppercase">{label}</p>
        {complete ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
        ) : (
          <XCircle className="h-3.5 w-3.5 text-red-400" />
        )}
      </div>
      {party.name ? (
        <>
          <p className="text-sm font-medium">{party.name}</p>
          <p className="text-xs text-slate-500">
            {[party.address, party.city, party.country].filter(Boolean).join(", ")}
          </p>
          {party.id_number && (
            <p className="text-xs text-slate-400">ID: {party.id_number}</p>
          )}
        </>
      ) : (
        <p className="text-xs text-slate-400 italic">Not provided</p>
      )}
    </div>
  );
}

export function CaseISF({ caseId, eta }: CaseISFProps) {
  const [loading, setLoading] = useState(false);
  const [isfData, setIsfData] = useState<ISFResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<string | null>(null);

  const loadISF = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/cases/${caseId}/isf`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error ?? "Failed to load ISF data");
      }
      const data: ISFResponse = await res.json();
      setIsfData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  function handleSubmit() {
    setSubmitResult("ISF submission is a stub. Integration with ACE/ABI is required for production.");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ship className="h-5 w-5 text-blue-600" />
          <h3 className="text-sm font-medium">ISF (10+2) Filing</h3>
        </div>
        <Button onClick={loadISF} disabled={loading} size="sm">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-1" />
          )}
          {isfData ? "Refresh" : "Load ISF Data"}
        </Button>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>
      )}

      {!isfData && !loading && !error && (
        <Card>
          <CardContent className="py-8 text-center text-slate-500 text-sm">
            Click &quot;Load ISF Data&quot; to auto-populate ISF from case documents.
          </CardContent>
        </Card>
      )}

      {isfData && (
        <>
          {/* Deadline and validation */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-slate-500 mb-1">Filing Deadline</p>
                <DeadlineCountdown deadline={isfData.isf.filing_deadline} />
                <p className="text-xs text-slate-400 mt-1">
                  {formatDeadline(isfData.isf.filing_deadline)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-slate-500 mb-1">Validation</p>
                <Badge
                  className={
                    isfData.validation.valid
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }
                >
                  {isfData.validation.valid ? "Valid" : `${isfData.validation.errors.length} Error(s)`}
                </Badge>
                {isfData.validation.warnings.length > 0 && (
                  <Badge className="bg-yellow-100 text-yellow-800 ml-1">
                    {isfData.validation.warnings.length} Warning(s)
                  </Badge>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-slate-500 mb-1">Status</p>
                <Badge className="bg-blue-100 text-blue-800 capitalize">
                  {isfData.isf.status}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Validation issues */}
          {(isfData.validation.errors.length > 0 || isfData.validation.warnings.length > 0) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Validation Issues</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {isfData.validation.errors.map((err, i) => (
                  <div key={`err-${i}`} className="flex items-center gap-2 text-sm">
                    <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                    <span className="text-red-700">{err}</span>
                  </div>
                ))}
                {isfData.validation.warnings.map((warn, i) => (
                  <div key={`warn-${i}`} className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
                    <span className="text-yellow-700">{warn}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Parties (10 elements) */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">ISF Parties (10 Importer Elements)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <PartyCard label="Importer" party={isfData.isf.importer} />
                <PartyCard label="Seller" party={isfData.isf.seller} />
                <PartyCard label="Buyer" party={isfData.isf.buyer} />
                <PartyCard label="Manufacturer" party={isfData.isf.manufacturer} />
                <PartyCard label="Ship To" party={isfData.isf.ship_to} />
                <PartyCard label="Container Stuffing Location" party={isfData.isf.container_stuffing_location} />
                <PartyCard label="Consolidator" party={isfData.isf.consolidator} />
              </div>
            </CardContent>
          </Card>

          {/* Shipment data */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Shipment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Bill of Lading:</span>{" "}
                  <span className="font-mono font-medium">{isfData.isf.bill_of_lading || "N/A"}</span>
                </div>
                <div>
                  <span className="text-slate-500">Country of Origin:</span>{" "}
                  <span className="font-medium">{isfData.isf.country_of_origin || "N/A"}</span>
                </div>
                <div>
                  <span className="text-slate-500">Vessel:</span>{" "}
                  <span className="font-medium">{isfData.isf.vessel_name ?? "N/A"}</span>
                </div>
                <div>
                  <span className="text-slate-500">Voyage:</span>{" "}
                  <span className="font-medium">{isfData.isf.voyage_number ?? "N/A"}</span>
                </div>
              </div>

              {/* HS Codes */}
              {isfData.isf.hs_codes.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    HS Codes
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {isfData.isf.hs_codes.map((code) => (
                      <Badge key={code} variant="secondary" className="font-mono">
                        {code}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Container numbers */}
              {isfData.isf.container_numbers.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Container Numbers
                  </p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Container Number</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isfData.isf.container_numbers.map((cn, i) => (
                        <TableRow key={cn}>
                          <TableCell className="text-slate-500">{i + 1}</TableCell>
                          <TableCell className="font-mono">{cn}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={handleSubmit} disabled={!isfData.validation.valid} size="sm">
              <Send className="h-4 w-4 mr-1" />
              Submit ISF
            </Button>
          </div>

          {submitResult && (
            <div className="text-sm bg-blue-50 text-blue-700 p-3 rounded">
              {submitResult}
            </div>
          )}
        </>
      )}
    </div>
  );
}
