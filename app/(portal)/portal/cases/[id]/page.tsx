import { redirect, notFound } from "next/navigation";
import { getPortalUser } from "@/lib/supabase/portal";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DocumentUpload } from "@/components/document-upload";
import { STATUS_COLORS } from "@/lib/types/database";
import type { CaseStatus, TransportMode } from "@/lib/types/database";
import { Ship, Plane, Truck, TrainFront, FileText } from "lucide-react";

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

function formatStatusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

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

  // Fetch the case — verify it belongs to this client
  const { data: entryCase } = await supabase
    .from("entry_cases")
    .select("*")
    .eq("id", params.id)
    .eq("client_account_id", portalUser.clientAccount.id)
    .single();

  if (!entryCase) notFound();

  // Fetch related data
  const [docsRes, workflowRes] = await Promise.all([
    supabase
      .from("documents")
      .select("id, doc_type, file_name, file_size_bytes, created_at")
      .eq("entry_case_id", params.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("workflow_events")
      .select("id, from_status, to_status, reason, created_at")
      .eq("entry_case_id", params.id)
      .order("created_at", { ascending: true }),
  ]);

  const documents = docsRes.data ?? [];
  const workflowEvents = workflowRes.data ?? [];
  const ModeIcon = MODE_ICONS[entryCase.mode_of_transport as TransportMode];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">
            {entryCase.case_number}
          </h1>
          <Badge
            className={STATUS_COLORS[entryCase.status as CaseStatus]}
            variant="secondary"
          >
            {formatStatusLabel(entryCase.status)}
          </Badge>
        </div>
        <p className="text-sm text-slate-500">
          {portalUser.clientAccount.name}
        </p>
      </div>

      {/* Key info */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pb-4 pt-4">
            <p className="text-xs text-slate-500">Mode</p>
            <div className="mt-1 flex items-center gap-1">
              <ModeIcon className="h-4 w-4 text-slate-600" />
              <span className="text-sm font-medium capitalize">
                {entryCase.mode_of_transport}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pb-4 pt-4">
            <p className="text-xs text-slate-500">ETA</p>
            <p className="mt-1 text-sm font-medium">
              {formatDate(entryCase.eta)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pb-4 pt-4">
            <p className="text-xs text-slate-500">Actual Arrival</p>
            <p className="mt-1 text-sm font-medium">
              {formatDate(entryCase.actual_arrival)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pb-4 pt-4">
            <p className="text-xs text-slate-500">Created</p>
            <p className="mt-1 text-sm font-medium">
              {formatDate(entryCase.created_at)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {workflowEvents.length === 0 ? (
            <p className="text-sm text-slate-500">No status changes yet.</p>
          ) : (
            <div className="space-y-3">
              {workflowEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 text-sm"
                >
                  <div className="mt-1.5 h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                  <div>
                    <p className="text-slate-900">
                      {event.from_status ? (
                        <>
                          {formatStatusLabel(event.from_status)}{" "}
                          <span className="text-slate-400">&rarr;</span>{" "}
                          {formatStatusLabel(event.to_status)}
                        </>
                      ) : (
                        <>Case created: {formatStatusLabel(event.to_status)}</>
                      )}
                    </p>
                    {event.reason && (
                      <p className="text-xs text-slate-500">{event.reason}</p>
                    )}
                    <p className="text-xs text-slate-400">
                      {formatDate(event.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Documents ({documents.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {documents.length > 0 && (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between rounded-md border border-slate-200 px-4 py-2"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {doc.file_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDocType(doc.doc_type)}
                        {doc.file_size_bytes
                          ? ` -- ${(doc.file_size_bytes / 1024).toFixed(0)} KB`
                          : ""}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400">
                    {formatDate(doc.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}

          <Separator />

          <div>
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
