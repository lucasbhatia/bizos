import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/supabase/portal";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDocType(docType: string): string {
  return docType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export default async function PortalDocumentsPage() {
  const portalUser = await getPortalUser();
  if (!portalUser) redirect("/login");

  const supabase = await createClient();

  // Fetch documents across all cases for this client
  const { data: documents } = await supabase
    .from("documents")
    .select("id, doc_type, file_name, file_size_bytes, created_at, entry_case_id, entry_case:entry_cases!inner(case_number, client_account_id)")
    .eq("entry_case.client_account_id", portalUser.clientAccount.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const docList = documents ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Documents</h1>
        <p className="text-sm text-slate-500">
          All documents across your cases
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            All Documents ({docList.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {docList.length === 0 ? (
            <p className="text-sm text-slate-500">No documents found.</p>
          ) : (
            <div className="space-y-2">
              {docList.map((doc) => {
                const caseInfo = Array.isArray(doc.entry_case)
                  ? doc.entry_case[0]
                  : doc.entry_case;
                return (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-md border border-slate-200 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-slate-400" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {doc.file_name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDocType(doc.doc_type)} --{" "}
                          {(caseInfo as { case_number: string } | null)?.case_number ?? "Unknown case"}
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
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
