import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/supabase/portal";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { STATUS_COLORS } from "@/lib/types/database";
import type { CaseStatus } from "@/lib/types/database";

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

export default async function PortalCasesPage() {
  const portalUser = await getPortalUser();
  if (!portalUser) redirect("/login");

  const supabase = createClient();

  const { data: cases } = await supabase
    .from("entry_cases")
    .select("id, case_number, status, eta, updated_at, mode_of_transport, priority")
    .eq("client_account_id", portalUser.clientAccount.id)
    .order("updated_at", { ascending: false });

  const caseList = cases ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Cases</h1>
        <p className="text-sm text-slate-500">
          {caseList.length} case{caseList.length !== 1 ? "s" : ""} for{" "}
          {portalUser.clientAccount.name}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Cases</CardTitle>
        </CardHeader>
        <CardContent>
          {caseList.length === 0 ? (
            <p className="text-sm text-slate-500">No cases found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Case Number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>ETA</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {caseList.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-slate-50">
                    <TableCell>
                      <Link
                        href={`/portal/cases/${c.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {c.case_number}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={STATUS_COLORS[c.status as CaseStatus]}
                        variant="secondary"
                      >
                        {formatStatusLabel(c.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">
                      {c.mode_of_transport}
                    </TableCell>
                    <TableCell>{formatDate(c.eta)}</TableCell>
                    <TableCell>{formatDate(c.updated_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
