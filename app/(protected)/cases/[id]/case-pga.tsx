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
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Shield,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import type { PGARequirement, PGAFieldRequirement } from "@/lib/adapters/pga";

interface CasePGAProps {
  caseId: string;
}

interface PGAResponse {
  requirements: PGARequirement[];
  total_agencies: number;
  hts_codes_checked: string[];
}

const AGENCY_COLORS: Record<string, string> = {
  FDA: "bg-blue-100 text-blue-800 border-blue-200",
  USDA: "bg-green-100 text-green-800 border-green-200",
  EPA: "bg-emerald-100 text-emerald-800 border-emerald-200",
  CPSC: "bg-orange-100 text-orange-800 border-orange-200",
  FCC: "bg-purple-100 text-purple-800 border-purple-200",
  APHIS: "bg-lime-100 text-lime-800 border-lime-200",
  TTB: "bg-amber-100 text-amber-800 border-amber-200",
  FWS: "bg-teal-100 text-teal-800 border-teal-200",
  DOT: "bg-yellow-100 text-yellow-800 border-yellow-200",
  DEA: "bg-red-100 text-red-800 border-red-200",
};

function FieldStatusIcon({ field }: { field: PGAFieldRequirement }) {
  // In a real app, this would check against submitted values
  if (field.required) {
    return <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />;
  }
  return <CheckCircle2 className="h-3.5 w-3.5 text-gray-300 shrink-0" />;
}

function AgencyCard({ requirement }: { requirement: PGARequirement }) {
  const [expanded, setExpanded] = useState(false);
  const requiredCount = requirement.fields.filter((f) => f.required).length;
  const colorClass = AGENCY_COLORS[requirement.agency.code] ?? "bg-gray-100 text-gray-800 border-gray-200";

  return (
    <Card className="border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className={colorClass}>{requirement.agency.code}</Badge>
            <div>
              <p className="text-sm font-medium">{requirement.agency.full_name}</p>
              <p className="text-xs text-slate-500">{requirement.reason}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="h-8 w-8 p-0"
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-4 text-xs text-slate-500 mb-2">
          <span>{requiredCount} required field(s)</span>
          <span>{requirement.fields.length} total field(s)</span>
          {requirement.hts_match && (
            <span className="font-mono">HTS: {requirement.hts_match}xx</span>
          )}
        </div>

        {expanded && (
          <div className="mt-3 border-t pt-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              {requirement.agency.description}
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">Status</TableHead>
                  <TableHead>Field</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Required</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requirement.fields.map((field) => (
                  <TableRow key={field.field_name}>
                    <TableCell>
                      <FieldStatusIcon field={field} />
                    </TableCell>
                    <TableCell className="text-sm font-medium">{field.label}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs capitalize">
                        {field.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {field.required ? (
                        <Badge className="bg-red-50 text-red-700 text-xs">Required</Badge>
                      ) : (
                        <span className="text-xs text-slate-400">Optional</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 max-w-[200px] truncate">
                      {field.description}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {requirement.fields.some((f) => f.options && f.options.length > 0) && (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Select Options
                </p>
                {requirement.fields
                  .filter((f) => f.options && f.options.length > 0)
                  .map((f) => (
                    <div key={f.field_name} className="text-xs">
                      <span className="font-medium">{f.label}:</span>{" "}
                      <span className="text-slate-500">
                        {f.options?.join(", ")}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function CasePGA({ caseId }: CasePGAProps) {
  const [loading, setLoading] = useState(false);
  const [pgaData, setPgaData] = useState<PGAResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPGA = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/cases/${caseId}/pga`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error ?? "Failed to load PGA requirements");
      }
      const data: PGAResponse = await res.json();
      setPgaData(data);
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
          <Shield className="h-5 w-5 text-blue-600" />
          <h3 className="text-sm font-medium">PGA Requirements</h3>
        </div>
        <Button onClick={loadPGA} disabled={loading} size="sm">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-1" />
          )}
          {pgaData ? "Refresh" : "Check PGA"}
        </Button>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>
      )}

      {!pgaData && !loading && !error && (
        <Card>
          <CardContent className="py-8 text-center text-slate-500 text-sm">
            Click &quot;Check PGA&quot; to determine which Partner Government Agencies
            apply based on HTS codes and commodity descriptions.
          </CardContent>
        </Card>
      )}

      {pgaData && (
        <>
          {/* Summary */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {pgaData.requirements.length} Applicable Agenc{pgaData.requirements.length === 1 ? "y" : "ies"}
                  </p>
                  <p className="text-xs text-slate-500">
                    Checked {pgaData.hts_codes_checked.length} HTS code(s):{" "}
                    {pgaData.hts_codes_checked.join(", ") || "none"}
                  </p>
                </div>
                {pgaData.requirements.length === 0 ? (
                  <Badge className="bg-green-100 text-green-800">No PGA Required</Badge>
                ) : (
                  <Badge className="bg-yellow-100 text-yellow-800">PGA Required</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Agency cards */}
          {pgaData.requirements.length > 0 && (
            <div className="space-y-3">
              {pgaData.requirements.map((req) => (
                <AgencyCard key={req.agency.code} requirement={req} />
              ))}
            </div>
          )}

          {pgaData.requirements.length === 0 && (
            <Card>
              <CardContent className="py-6 text-center">
                <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-slate-600">
                  No Partner Government Agency filings are required for the HTS codes
                  associated with this shipment.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
