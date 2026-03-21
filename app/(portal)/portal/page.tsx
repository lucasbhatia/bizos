import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/supabase/portal";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Briefcase, Upload, ArrowRight } from "lucide-react";
import { STATUS_COLORS } from "@/lib/types/database";
import type { CaseStatus } from "@/lib/types/database";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatStatusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export default async function PortalDashboardPage() {
  const portalUser = await getPortalUser();
  if (!portalUser) redirect("/login");

  const supabase = createClient();
  const clientAccountId = portalUser.clientAccount.id;

  // Fetch active cases and recent updates
  const [activeCasesRes, recentCasesRes] = await Promise.all([
    supabase
      .from("entry_cases")
      .select("id", { count: "exact", head: true })
      .eq("client_account_id", clientAccountId)
      .not("status", "in", '("closed","archived")'),
    supabase
      .from("entry_cases")
      .select("id, case_number, status, eta, updated_at")
      .eq("client_account_id", clientAccountId)
      .order("updated_at", { ascending: false })
      .limit(5),
  ]);

  const activeCaseCount = activeCasesRes.count ?? 0;
  const recentCases = recentCasesRes.data ?? [];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome, {portalUser.contact.name}
        </h1>
        <p className="text-sm text-slate-500">
          {portalUser.clientAccount.name} -- Client Portal
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-md bg-blue-100 p-3">
              <Briefcase className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {activeCaseCount}
              </p>
              <p className="text-sm text-slate-500">Active Cases</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-md bg-green-100 p-3">
              <Upload className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">
                Upload Documents
              </p>
              <p className="text-xs text-slate-500">
                Submit required docs for your cases
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-md bg-purple-100 p-3">
              <ArrowRight className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <Button variant="link" className="h-auto p-0" asChild>
                <Link href="/portal/cases">View All Cases</Link>
              </Button>
              <p className="text-xs text-slate-500">
                Track status and updates
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent case updates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Case Updates</CardTitle>
        </CardHeader>
        <CardContent>
          {recentCases.length === 0 ? (
            <p className="text-sm text-slate-500">No cases found.</p>
          ) : (
            <div className="space-y-3">
              {recentCases.map((c) => (
                <Link
                  key={c.id}
                  href={`/portal/cases/${c.id}`}
                  className="flex items-center justify-between rounded-md border border-slate-200 px-4 py-3 transition-colors hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-900">
                      {c.case_number}
                    </span>
                    <Badge
                      className={STATUS_COLORS[c.status as CaseStatus]}
                      variant="secondary"
                    >
                      {formatStatusLabel(c.status)}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-500">
                    Updated {formatDate(c.updated_at)}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick links */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-sm font-medium text-slate-900">
              Need to submit documents?
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Go to any case and use the upload button to attach invoices,
              packing lists, and other required documents.
            </p>
            <Button variant="outline" size="sm" className="mt-3" asChild>
              <Link href="/portal/cases">Go to My Cases</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-sm font-medium text-slate-900">
              Have a question?
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Use the Messages section to communicate with your customs broker
              team directly.
            </p>
            <Button variant="outline" size="sm" className="mt-3" asChild>
              <Link href="/portal/messages">Go to Messages</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
