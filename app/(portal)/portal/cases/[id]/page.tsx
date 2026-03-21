import { redirect, notFound } from "next/navigation";
import { getPortalUser } from "@/lib/supabase/portal";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DocumentUpload } from "@/components/document-upload";
import type { CaseStatus, TransportMode } from "@/lib/types/database";
import {
  Ship,
  Plane,
  Truck,
  TrainFront,
  FileText,
  CheckCircle2,
  Circle,
  Upload,
  Calendar,
} from "lucide-react";

const MODE_ICONS: Record<TransportMode, React.ElementType> = {
  ocean: Ship,
  air: Plane,
  truck: Truck,
  rail: TrainFront,
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* Simplified 5-stage pipeline for portal view */
const STAGES = [
  { key: "documents", label: "Documents" },
  { key: "review", label: "Review" },
  { key: "filed", label: "Filed" },
  { key: "customs", label: "Customs" },
  { key: "cleared", label: "Cleared" },
] as const;

type StageKey = (typeof STAGES)[number]["key"];

function mapStatusToStage(status: CaseStatus): StageKey {
  switch (status) {
    case "intake":
    case "awaiting_docs":
      return "documents";
    case "docs_validated":
    case "classification_review":
      return "review";
    case "entry_prep":
    case "submitted":
      return "filed";
    case "govt_review":
    case "hold":
      return "customs";
    case "released":
    case "billing":
    case "closed":
    case "archived":
      return "cleared";
    default:
      return "documents";
  }
}

function getStageIndex(stage: StageKey): number {
  return STAGES.findIndex((s) => s.key === stage);
}

/* Document checklist items expected for a case */
const DOC_CHECKLIST = [
  "commercial_invoice",
  "packing_list",
  "bill_of_lading",
  "customs_power_of_attorney",
  "isf_data",
] as const;

function formatDocType(docType: string): string {
  return docType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export default async function PortalCaseDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const portalUser = await getPortalUser();
  if (!portalUser) redirect("/login");

  const supabase = createClient();

  // Fetch the case -- verify it belongs to this client
  const { data: entryCase } = await supabase
    .from("entry_cases")
    .select("*")
    .eq("id", params.id)
    .eq("client_account_id", portalUser.clientAccount.id)
    .single();

  if (!entryCase) notFound();

  // Fetch documents
  const { data: rawDocs } = await supabase
    .from("documents")
    .select("id, doc_type, file_name, file_size_bytes, created_at")
    .eq("entry_case_id", params.id)
    .order("created_at", { ascending: false });

  const documents = rawDocs ?? [];
  const ModeIcon = MODE_ICONS[entryCase.mode_of_transport as TransportMode];

  const currentStage = mapStatusToStage(entryCase.status as CaseStatus);
  const currentStageIdx = getStageIndex(currentStage);

  // Build document checklist
  const uploadedTypes = new Set(documents.map((d) => d.doc_type));

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
            <ModeIcon className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <h1 className="font-mono-code text-xl font-bold text-slate-900">
              {entryCase.case_number}
            </h1>
            <p className="text-sm text-slate-500">
              {portalUser.clientAccount.name}
            </p>
          </div>
        </div>
      </div>

      {/* Key details row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Mode
            </p>
            <div className="mt-1 flex items-center gap-1.5">
              <ModeIcon className="h-4 w-4 text-slate-500" />
              <span className="text-sm font-semibold capitalize text-slate-800">
                {entryCase.mode_of_transport}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              ETA
            </p>
            <div className="mt-1 flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-slate-500" />
              <span className="text-sm font-semibold text-slate-800">
                {formatDate(entryCase.eta)}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Arrival
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              {formatDate(entryCase.actual_arrival)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Created
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              {formatDate(entryCase.created_at)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Simplified 5-stage timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Shipment Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            {STAGES.map((stage, idx) => {
              const isComplete = idx < currentStageIdx;
              const isCurrent = idx === currentStageIdx;

              return (
                <div key={stage.key} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors ${
                        isComplete
                          ? "border-green-500 bg-green-500 text-white"
                          : isCurrent
                            ? "border-blue-500 bg-blue-50 text-blue-600"
                            : "border-slate-200 bg-white text-slate-300"
                      }`}
                    >
                      {isComplete ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <Circle
                          className={`h-4 w-4 ${isCurrent ? "fill-blue-500 text-blue-500" : ""}`}
                        />
                      )}
                    </div>
                    <span
                      className={`mt-2 text-xs font-medium ${
                        isComplete
                          ? "text-green-700"
                          : isCurrent
                            ? "text-blue-700"
                            : "text-slate-400"
                      }`}
                    >
                      {stage.label}
                    </span>
                  </div>
                  {idx < STAGES.length - 1 && (
                    <div
                      className={`mx-1 h-0.5 flex-1 ${
                        idx < currentStageIdx ? "bg-green-400" : "bg-slate-200"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Document checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Document Checklist
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            {DOC_CHECKLIST.map((docType) => {
              const uploaded = uploadedTypes.has(docType);
              const matchingDoc = documents.find((d) => d.doc_type === docType);

              return (
                <div
                  key={docType}
                  className={`flex items-center justify-between rounded-lg border px-4 py-3 transition-colors ${
                    uploaded
                      ? "border-green-200 bg-green-50/50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {uploaded ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <Circle className="h-5 w-5 text-slate-300" />
                    )}
                    <div>
                      <p
                        className={`text-sm font-medium ${
                          uploaded ? "text-green-800" : "text-slate-700"
                        }`}
                      >
                        {formatDocType(docType)}
                      </p>
                      {matchingDoc && (
                        <p className="text-xs text-slate-400">
                          {matchingDoc.file_name}
                          {matchingDoc.file_size_bytes
                            ? ` -- ${(matchingDoc.file_size_bytes / 1024).toFixed(0)} KB`
                            : ""}
                        </p>
                      )}
                    </div>
                  </div>
                  {!uploaded && (
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs" disabled>
                      <Upload className="h-3 w-3" />
                      Upload
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Additional uploaded documents */}
          {documents.filter((d) => !DOC_CHECKLIST.includes(d.doc_type as (typeof DOC_CHECKLIST)[number])).length > 0 && (
            <>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Additional Documents
              </p>
              <div className="space-y-2">
                {documents
                  .filter((d) => !DOC_CHECKLIST.includes(d.doc_type as (typeof DOC_CHECKLIST)[number]))
                  .map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3"
                    >
                      <FileText className="h-4 w-4 text-slate-400" />
                      <div>
                        <p className="text-sm font-medium text-slate-700">
                          {doc.file_name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {formatDocType(doc.doc_type)}
                          {doc.file_size_bytes
                            ? ` -- ${(doc.file_size_bytes / 1024).toFixed(0)} KB`
                            : ""}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </>
          )}

          {/* Upload section */}
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/50 p-4">
            <p className="mb-2 text-sm font-medium text-slate-700">
              Upload a Document
            </p>
            <DocumentUpload caseId={entryCase.id} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
