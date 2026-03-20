import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Check, AlertCircle, Clock } from "lucide-react";
import { DocumentUpload } from "@/components/document-upload";
import type { DocType, ParseStatus } from "@/lib/types/database";

interface Document {
  id: string;
  doc_type: DocType;
  file_name: string;
  file_size_bytes: number | null;
  version: number;
  parse_status: ParseStatus;
  extracted_data: Record<string, unknown>;
  created_at: string;
}

function formatLabel(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

const PARSE_STATUS_ICON: Record<ParseStatus, React.ElementType> = {
  pending: Clock,
  processing: Clock,
  completed: Check,
  failed: AlertCircle,
};

const PARSE_STATUS_COLOR: Record<ParseStatus, string> = {
  pending: "text-yellow-600",
  processing: "text-blue-600",
  completed: "text-green-600",
  failed: "text-red-600",
};

export function CaseDocuments({
  caseId,
  documents,
  requiredDocs,
}: {
  caseId: string;
  documents: Document[];
  requiredDocs: DocType[];
}) {
  const docsByType = new Map<DocType, Document[]>();
  for (const doc of documents) {
    const existing = docsByType.get(doc.doc_type) ?? [];
    existing.push(doc);
    docsByType.set(doc.doc_type, existing);
  }

  return (
    <div className="space-y-4">
      <DocumentUpload caseId={caseId} />
      <h3 className="text-sm font-medium text-slate-500">Required Documents</h3>
      <div className="grid gap-3">
        {requiredDocs.map((docType) => {
          const docs = docsByType.get(docType);
          const hasDoc = docs && docs.length > 0;
          const latestDoc = hasDoc ? docs[0] : null;

          return (
            <Card key={docType} className={!hasDoc ? "border-dashed border-orange-300" : ""}>
              <CardContent className="flex items-center gap-4 py-3">
                <FileText className={`h-5 w-5 ${hasDoc ? "text-green-600" : "text-orange-400"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{formatLabel(docType)}</p>
                  {latestDoc ? (
                    <p className="text-xs text-slate-500">
                      {latestDoc.file_name} — {formatFileSize(latestDoc.file_size_bytes)}
                      {latestDoc.version > 1 && ` (v${latestDoc.version})`}
                    </p>
                  ) : (
                    <p className="text-xs text-orange-500">Not uploaded</p>
                  )}
                </div>
                {latestDoc && (() => {
                  const StatusIcon = PARSE_STATUS_ICON[latestDoc.parse_status];
                  return (
                    <Badge variant="secondary" className={PARSE_STATUS_COLOR[latestDoc.parse_status]}>
                      <StatusIcon className="mr-1 h-3 w-3" />
                      {formatLabel(latestDoc.parse_status)}
                    </Badge>
                  );
                })()}
                {!hasDoc && (
                  <Badge variant="outline" className="text-orange-500 border-orange-300">
                    Missing
                  </Badge>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Additional documents not in required list */}
      {(() => {
        const additionalDocs = documents.filter(
          (d) => !requiredDocs.includes(d.doc_type)
        );
        if (additionalDocs.length === 0) return null;
        return (
          <>
            <h3 className="text-sm font-medium text-slate-500 mt-6">Additional Documents</h3>
            <div className="grid gap-3">
              {additionalDocs.map((doc) => (
                <Card key={doc.id}>
                  <CardContent className="flex items-center gap-4 py-3">
                    <FileText className="h-5 w-5 text-slate-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{formatLabel(doc.doc_type)}</p>
                      <p className="text-xs text-slate-500">
                        {doc.file_name} — {formatFileSize(doc.file_size_bytes)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        );
      })()}
    </div>
  );
}
