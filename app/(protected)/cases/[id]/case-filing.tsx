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
  Package,
  Download,
  Send,
  RefreshCw,
  FileText,
} from "lucide-react";

interface ChecklistItem {
  label: string;
  category: "documents" | "classifications" | "client_info" | "case_info";
  passed: boolean;
  detail: string;
}

interface FilingHistoryEntry {
  submittedAt: string;
  status: string;
  filingId: string;
  provider: string;
}

interface FilingPacket {
  caseId: string;
  caseNumber: string;
  status: string;
  mode: string;
  eta: string | null;
  actualArrival: string | null;
  priority: string;
  riskScore: number | null;
  client: {
    name: string;
    importerOfRecordNumber: string | null;
    billingTerms: Record<string, unknown>;
  } | null;
  classifications: { lineItemIndex: number; htsCode: string }[];
  documents: {
    id: string;
    docType: string;
    fileName: string;
    parseStatus: string;
    extractedData: Record<string, unknown>;
  }[];
  lineItems: {
    description: string;
    quantity?: number;
    unitPrice?: number;
    total?: number;
    countryOfOrigin?: string;
    hsCodeHint?: string;
  }[];
  filingHistory: FilingHistoryEntry[];
  generatedAt: string;
}

interface PacketResponse {
  ready: boolean;
  checklist: ChecklistItem[];
  missingItems: string[];
  packet: FilingPacket;
}

const CATEGORY_LABELS: Record<string, string> = {
  documents: "Required Documents",
  classifications: "HTS Classifications",
  client_info: "Client Information",
  case_info: "Case Information",
};

const FILING_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  transmitted: "bg-blue-100 text-blue-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  under_review: "bg-purple-100 text-purple-800",
  error: "bg-red-100 text-red-800",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CaseFiling({ caseId }: { caseId: string }) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [packetData, setPacketData] = useState<PacketResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<string | null>(null);

  const loadPacket = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/cases/${caseId}/filing-packet`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error ?? "Failed to load filing packet");
      }
      const data: PacketResponse = await res.json();
      setPacketData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitResult(null);
    try {
      const res = await fetch(`/api/cases/${caseId}/filing-packet/submit`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setSubmitResult(
          `Filing ${data.filing.filingId} submitted successfully. Status: ${data.filing.status}`
        );
        // Reload packet to refresh filing history
        await loadPacket();
      } else {
        setSubmitResult(`Submission failed: ${data.error ?? "Unknown error"}`);
      }
    } catch {
      setSubmitResult("Failed to submit filing. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleExport() {
    if (!packetData) return;
    const blob = new Blob([JSON.stringify(packetData.packet, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `filing-packet-${packetData.packet.caseNumber}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Group checklist by category
  const groupedChecklist: Record<string, ChecklistItem[]> = {};
  if (packetData) {
    for (const item of packetData.checklist) {
      if (!groupedChecklist[item.category]) {
        groupedChecklist[item.category] = [];
      }
      groupedChecklist[item.category].push(item);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-blue-600" />
          <h3 className="text-sm font-medium">Filing Packet Builder</h3>
        </div>
        <Button onClick={loadPacket} disabled={loading} size="sm">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-1" />
          )}
          {packetData ? "Refresh" : "Check Readiness"}
        </Button>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
          {error}
        </div>
      )}

      {!packetData && !loading && !error && (
        <Card>
          <CardContent className="py-8 text-center text-slate-500 text-sm">
            Click &quot;Check Readiness&quot; to evaluate filing requirements
            and build the filing packet.
          </CardContent>
        </Card>
      )}

      {packetData && (
        <>
          {/* Readiness status */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Filing Readiness</CardTitle>
                <Badge
                  className={
                    packetData.ready
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }
                >
                  {packetData.ready ? "Ready to File" : "Not Ready"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(groupedChecklist).map(([category, items]) => (
                <div key={category}>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    {CATEGORY_LABELS[category] ?? category}
                  </p>
                  <div className="space-y-1">
                    {items.map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center gap-2 text-sm"
                      >
                        {item.passed ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                        )}
                        <span
                          className={
                            item.passed ? "text-slate-700" : "text-red-700"
                          }
                        >
                          {item.label}
                        </span>
                        <span className="text-xs text-slate-400 ml-auto">
                          {item.detail}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Packet data summary */}
          {packetData.ready && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Assembled Filing Packet
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Case info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Case:</span>{" "}
                    <span className="font-medium">
                      {packetData.packet.caseNumber}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Mode:</span>{" "}
                    <span className="font-medium capitalize">
                      {packetData.packet.mode}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Client:</span>{" "}
                    <span className="font-medium">
                      {packetData.packet.client?.name ?? "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">IOR:</span>{" "}
                    <span className="font-medium">
                      {packetData.packet.client?.importerOfRecordNumber ??
                        "N/A"}
                    </span>
                  </div>
                </div>

                {/* Line items with classifications */}
                {packetData.packet.lineItems.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      Classified Line Items
                    </p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>HTS Code</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Value</TableHead>
                          <TableHead>Origin</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {packetData.packet.lineItems.map((li, i) => {
                          const classification =
                            packetData.packet.classifications.find(
                              (c) => c.lineItemIndex === i
                            );
                          return (
                            <TableRow key={i}>
                              <TableCell className="text-slate-500">
                                {i + 1}
                              </TableCell>
                              <TableCell className="text-sm">
                                {li.description}
                              </TableCell>
                              <TableCell>
                                <span className="font-mono text-sm">
                                  {classification?.htsCode ?? "—"}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                {li.quantity ?? "—"}
                              </TableCell>
                              <TableCell className="text-right">
                                {li.total != null
                                  ? `$${li.total.toLocaleString()}`
                                  : "—"}
                              </TableCell>
                              <TableCell>
                                {li.countryOfOrigin ?? "—"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Documents included */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Documents ({packetData.packet.documents.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {packetData.packet.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center gap-1 text-xs bg-slate-50 rounded px-2 py-1"
                      >
                        <FileText className="h-3 w-3 text-slate-400" />
                        <span>{doc.fileName}</span>
                        <Badge
                          variant="secondary"
                          className={
                            doc.parseStatus === "completed"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }
                        >
                          {doc.parseStatus}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t">
                  <Button onClick={handleExport} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-1" />
                    Export JSON
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting}
                    size="sm"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Send className="h-4 w-4 mr-1" />
                    )}
                    Submit to CBP
                  </Button>
                </div>

                {submitResult && (
                  <div className="text-sm bg-blue-50 text-blue-700 p-3 rounded">
                    {submitResult}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Filing history */}
          {packetData.packet.filingHistory.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Submission History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Filing ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Submitted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {packetData.packet.filingHistory.map((entry) => (
                      <TableRow key={entry.filingId}>
                        <TableCell className="font-mono text-sm">
                          {entry.filingId}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              FILING_STATUS_COLORS[entry.status] ??
                              "bg-gray-100 text-gray-800"
                            }
                          >
                            {entry.status.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {entry.provider}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(entry.submittedAt)}
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
