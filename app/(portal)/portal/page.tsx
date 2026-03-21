import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/supabase/portal";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Ship,
  Upload,
  Clock,
  CheckCircle2,
  AlertTriangle,
  PauseCircle,
  ArrowRight,
} from "lucide-react";
import type { CaseStatus } from "@/lib/types/database";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatRelativeDate(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatDate(dateStr);
}

type SimplifiedStatus = "In Progress" | "Action Needed" | "Cleared" | "On Hold";

function getSimplifiedStatus(status: CaseStatus): SimplifiedStatus {
  switch (status) {
    case "released":
    case "closed":
    case "archived":
      return "Cleared";
    case "hold":
      return "On Hold";
    case "intake":
    case "awaiting_docs":
      return "Action Needed";
    default:
      return "In Progress";
  }
}

function getStatusConfig(simplified: SimplifiedStatus) {
  switch (simplified) {
    case "In Progress":
      return {
        icon: Clock,
        badge: "bg-blue-50 text-blue-700 border-blue-200",
        border: "border-slate-200",
        iconColor: "text-blue-500",
      };
    case "Action Needed":
      return {
        icon: AlertTriangle,
        badge: "bg-amber-50 text-amber-700 border-amber-200",
        border: "border-amber-300",
        iconColor: "text-amber-500",
      };
    case "Cleared":
      return {
        icon: CheckCircle2,
        badge: "bg-green-50 text-green-700 border-green-200",
        border: "border-slate-200",
        iconColor: "text-green-500",
      };
    case "On Hold":
      return {
        icon: PauseCircle,
        badge: "bg-slate-50 text-slate-600 border-slate-200",
        border: "border-slate-200",
        iconColor: "text-slate-400",
      };
  }
}

export default async function PortalDashboardPage() {
  const portalUser = await getPortalUser();
  if (!portalUser) redirect("/login");

  const supabase = await createClient();
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
      .limit(6),
  ]);

  const activeCaseCount = activeCasesRes.count ?? 0;
  const recentCases = recentCasesRes.data ?? [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back, {portalUser.contact.name}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Here is the latest on your shipments
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="transition-all hover:-translate-y-px hover:shadow-md">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
              <Ship className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {activeCaseCount}
              </p>
              <p className="text-sm text-slate-500">Active Shipments</p>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-all hover:-translate-y-px hover:shadow-md">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {recentCases.filter(
                  (c) =>
                    getSimplifiedStatus(c.status as CaseStatus) ===
                    "Action Needed"
                ).length}
              </p>
              <p className="text-sm text-slate-500">Needs Attention</p>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-all hover:-translate-y-px hover:shadow-md">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {recentCases.filter(
                  (c) =>
                    getSimplifiedStatus(c.status as CaseStatus) === "Cleared"
                ).length}
              </p>
              <p className="text-sm text-slate-500">Recently Cleared</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shipment cards */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Your Shipments
          </h2>
          <Button variant="ghost" size="sm" className="text-slate-500" asChild>
            <Link href="/portal/cases">
              View All
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {recentCases.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Ship className="mb-3 h-10 w-10 text-slate-300" />
              <p className="text-sm font-medium text-slate-500">
                No shipments found
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Your active shipments will appear here
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recentCases.map((c) => {
              const simplified = getSimplifiedStatus(c.status as CaseStatus);
              const config = getStatusConfig(simplified);
              const StatusIcon = config.icon;
              const needsDocs = simplified === "Action Needed";

              return (
                <Link key={c.id} href={`/portal/cases/${c.id}`}>
                  <Card
                    className={`group cursor-pointer border-l-4 transition-all hover:-translate-y-px hover:shadow-md ${config.border}`}
                  >
                    <CardContent className="p-4">
                      <div className="mb-3 flex items-start justify-between">
                        <span className="font-mono-code text-sm font-semibold text-slate-800">
                          {c.case_number}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-xs ${config.badge}`}
                        >
                          <StatusIcon className={`mr-1 h-3 w-3 ${config.iconColor}`} />
                          {simplified}
                        </Badge>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-500">
                        {c.eta && (
                          <div className="flex items-center justify-between">
                            <span>ETA</span>
                            <span className="font-medium text-slate-700">
                              {formatDate(c.eta)}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span>Last Update</span>
                          <span className="text-slate-400">
                            {formatRelativeDate(c.updated_at)}
                          </span>
                        </div>
                      </div>

                      {needsDocs && (
                        <div className="mt-3 flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700">
                          <Upload className="h-3 w-3" />
                          Upload Documents
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
