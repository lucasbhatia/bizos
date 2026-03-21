import { getCurrentUser, createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { FileText, Check, Clock, AlertCircle, Search } from "lucide-react";
import type { ParseStatus, DocType } from "@/lib/types/database";

function formatLabel(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

const PARSE_STATUS_COLOR: Record<ParseStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Documents</h1>
        <p className="text-sm text-slate-500">{total} documents across all cases</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-slate-500">Total Documents</p>
            <p className="text-2xl font-bold">{total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-slate-500">Parsed</p>
            <p className="text-2xl font-bold text-green-600">{parsed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-slate-500">Pending Parse</p>
            <p className="text-2xl font-bold text-yellow-600">{pending}</p>
          </CardContent>
        </Card>
      </div>

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
                <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                  <Search className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                  No documents uploaded yet
                </td>
              </tr>
            )}
            {docs.map((doc) => {
              const caseData = Array.isArray(doc.entry_case) ? doc.entry_case[0] : doc.entry_case;
              return (
                <tr key={doc.id} className="border-b hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-400" />
                      <span className="font-medium">{doc.file_name}</span>
                      {doc.version > 1 && (
                        <Badge variant="outline" className="text-xs">v{doc.version}</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">{formatLabel(doc.doc_type)}</td>
                  <td className="px-4 py-3">
                    {caseData ? (
                      <Link href={`/cases/${doc.entry_case_id}`} className="text-blue-600 hover:underline font-mono text-xs">
                        {(caseData as { case_number: string }).case_number}
                      </Link>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatFileSize(doc.file_size_bytes)}</td>
                  <td className="px-4 py-3">
                    <Badge className={PARSE_STATUS_COLOR[doc.parse_status as ParseStatus]}>
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
