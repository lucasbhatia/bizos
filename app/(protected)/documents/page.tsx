import { getCurrentUser, createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import {
  FileText,
  FileSpreadsheet,
  FileImage,
  File,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
} from "lucide-react";
import type { ParseStatus, DocType } from "@/lib/types/database";

function formatLabel(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "\u2014";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

const PARSE_STATUS_CONFIG: Record<ParseStatus, { className: string; icon: typeof CheckCircle2 }> = {
  pending: { className: "bg-yellow-100 text-yellow-800", icon: Clock },
  processing: { className: "bg-blue-100 text-blue-800", icon: Loader2 },
  completed: { className: "bg-green-100 text-green-800", icon: CheckCircle2 },
  failed: { className: "bg-red-100 text-red-800", icon: XCircle },
};

function getFileIcon(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return <FileText className="h-4 w-4 text-red-400" />;
  if (ext === "xlsx" || ext === "xls" || ext === "csv") return <FileSpreadsheet className="h-4 w-4 text-green-500" />;
  if (ext === "png" || ext === "jpg" || ext === "jpeg" || ext === "gif") return <FileImage className="h-4 w-4 text-purple-400" />;
  if (ext === "doc" || ext === "docx") return <FileText className="h-4 w-4 text-blue-500" />;
  return <File className="h-4 w-4 text-slate-400" />;
}

export default async function DocumentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = createServiceClient();

  const { data: documents } = await supabase
    .from("documents")
    .select("*, entry_case:entry_cases(case_number), uploaded_by:users(full_name)")
    .eq("tenant_id", user.tenant_id)
    .order("created_at", { ascending: false })
    .limit(100);

  const docs = documents ?? [];

  // Stats
  const total = docs.length;
  const parsed = docs.filter((d) => d.parse_status === "completed").length;
  const pending = docs.filter((d) => d.parse_status === "pending").length;
  const failed = docs.filter((d) => d.parse_status === "failed").length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
          <FileText className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Documents</h1>
          <p className="text-sm text-slate-500">{total} documents across all cases</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="rounded-xl bg-white shadow-sm border border-l-4 border-l-slate-400">
          <CardContent className="p-5">
            <p className="text-sm text-slate-500 font-medium">Total Documents</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{total}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl bg-white shadow-sm border border-l-4 border-l-green-500">
          <CardContent className="p-5">
            <p className="text-sm text-slate-500 font-medium">Parsed</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{parsed}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl bg-white shadow-sm border border-l-4 border-l-yellow-500">
          <CardContent className="p-5">
            <p className="text-sm text-slate-500 font-medium">Pending</p>
            <p className="text-2xl font-bold text-yellow-600 mt-1">{pending}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl bg-white shadow-sm border border-l-4 border-l-red-500">
          <CardContent className="p-5">
            <p className="text-sm text-slate-500 font-medium">Failed</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{failed}</p>
          </CardContent>
        </Card>
      </div>

      {/* Documents Table */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-left">
              <th className="px-4 py-3 font-medium text-slate-600">File Name</th>
              <th className="px-4 py-3 font-medium text-slate-600">Type</th>
              <th className="px-4 py-3 font-medium text-slate-600">Case</th>
              <th className="px-4 py-3 font-medium text-slate-600">Size</th>
              <th className="px-4 py-3 font-medium text-slate-600">Parse Status</th>
              <th className="px-4 py-3 font-medium text-slate-600">Uploaded</th>
            </tr>
          </thead>
          <tbody>
            {docs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 mb-3">
                      <Search className="h-6 w-6 text-slate-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-600">No documents uploaded yet</p>
                    <p className="text-xs text-slate-400 mt-1">Upload documents from a case detail page</p>
                  </div>
                </td>
              </tr>
            )}
            {docs.map((doc, idx) => {
              const caseData = Array.isArray(doc.entry_case) ? doc.entry_case[0] : doc.entry_case;
              const statusConfig = PARSE_STATUS_CONFIG[doc.parse_status as ParseStatus];
              const StatusIcon = statusConfig?.icon ?? Clock;
              return (
                <tr
                  key={doc.id}
                  className={`border-b hover:bg-blue-50/30 transition-colors ${
                    idx % 2 === 1 ? "bg-slate-50/50" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getFileIcon(doc.file_name)}
                      <span className="font-medium text-slate-800">{doc.file_name}</span>
                      {doc.version > 1 && (
                        <Badge variant="outline" className="rounded-full text-xs">v{doc.version}</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatLabel(doc.doc_type)}</td>
                  <td className="px-4 py-3">
                    {caseData ? (
                      <Link href={`/cases/${doc.entry_case_id}`} className="text-blue-600 hover:underline font-mono text-xs">
                        {(caseData as { case_number: string }).case_number}
                      </Link>
                    ) : "\u2014"}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatFileSize(doc.file_size_bytes)}</td>
                  <td className="px-4 py-3">
                    <Badge className={`rounded-full ${statusConfig?.className ?? "bg-slate-100 text-slate-600"}`}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {formatLabel(doc.parse_status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
