import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { InvoicesFilters } from "./invoices-filters";
import { InvoicesTable } from "./invoices-table";

interface SearchParams {
  status?: string;
  client?: string;
  from?: string;
  to?: string;
  page?: string;
}

const PAGE_SIZE = 25;

export default async function FinancePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = createClient();
  const page = parseInt(searchParams.page ?? "1", 10);
  const offset = (page - 1) * PAGE_SIZE;

  // Build query
  let query = supabase
    .from("invoices")
    .select(
      "*, client_account:client_accounts(id, name), entry_case:entry_cases(id, case_number)",
      { count: "exact" }
    );

  if (searchParams.status) {
    query = query.eq("status", searchParams.status);
  }

  if (searchParams.client) {
    query = query.eq("client_account_id", searchParams.client);
  }

  if (searchParams.from) {
    query = query.gte("created_at", searchParams.from);
  }

  if (searchParams.to) {
    query = query.lte("created_at", searchParams.to);
  }

  query = query
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  const { data: invoices, count } = await query;

  // Stats queries
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [outstandingRes, overdueRes, paidRes] = await Promise.all([
    supabase
      .from("invoices")
      .select("total")
      .in("status", ["sent", "overdue"]),
    supabase
      .from("invoices")
      .select("total")
      .eq("status", "overdue"),
    supabase
      .from("invoices")
      .select("total")
      .eq("status", "paid")
      .gte("paid_at", monthStart),
  ]);

  const totalOutstanding = (outstandingRes.data ?? []).reduce(
    (sum, inv) => sum + Number(inv.total),
    0
  );
  const totalOverdue = (overdueRes.data ?? []).reduce(
    (sum, inv) => sum + Number(inv.total),
    0
  );
  const paidThisMonth = (paidRes.data ?? []).reduce(
    (sum, inv) => sum + Number(inv.total),
    0
  );

  // Get filter options
  const { data: clients } = await supabase
    .from("client_accounts")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  }

  const stats = [
    {
      label: "Total Outstanding",
      value: formatCurrency(totalOutstanding),
      color: totalOutstanding > 0 ? "text-blue-600" : "text-green-600",
    },
    {
      label: "Overdue",
      value: formatCurrency(totalOverdue),
      color: totalOverdue > 0 ? "text-red-600" : "text-green-600",
    },
    {
      label: "Paid This Month",
      value: formatCurrency(paidThisMonth),
      color: "text-green-600",
    },
    {
      label: "Total Invoices",
      value: String(count ?? 0),
      color: "text-slate-900",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Finance</h1>
          <p className="text-sm text-slate-500">
            Manage invoices and payments
          </p>
        </div>
        <Button asChild>
          <Link href="/finance/new">Create Invoice</Link>
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <InvoicesFilters
        clients={clients ?? []}
        currentFilters={{
          status: searchParams.status,
          client: searchParams.client,
          from: searchParams.from,
          to: searchParams.to,
        }}
      />

      <InvoicesTable invoices={invoices ?? []} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={{
                    pathname: "/finance",
                    query: { ...searchParams, page: String(page - 1) },
                  }}
                >
                  Previous
                </Link>
              </Button>
            )}
            {page < totalPages && (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={{
                    pathname: "/finance",
                    query: { ...searchParams, page: String(page + 1) },
                  }}
                >
                  Next
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
