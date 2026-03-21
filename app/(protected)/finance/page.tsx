import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { InvoicesFilters } from "./invoices-filters";
import { InvoicesTable } from "./invoices-table";
import {
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

interface SearchParams {
  status?: string;
  client?: string;
  from?: string;
  to?: string;
  page?: string;
}

const PAGE_SIZE = 25;

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

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
  const monthStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  ).toISOString();

  const [invoicedRes, outstandingRes, overdueRes, paidRes] = await Promise.all([
    supabase
      .from("invoices")
      .select("total")
      .gte("created_at", monthStart)
      .not("status", "eq", "cancelled"),
    supabase
      .from("invoices")
      .select("total")
      .in("status", ["sent", "overdue"]),
    supabase.from("invoices").select("total").eq("status", "overdue"),
    supabase
      .from("invoices")
      .select("total")
      .eq("status", "paid")
      .gte("paid_at", monthStart),
  ]);

  const invoicedThisMonth = (invoicedRes.data ?? []).reduce(
    (sum, inv) => sum + Number(inv.total),
    0
  );
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

  // AR aging buckets
  const { data: arInvoices } = await supabase
    .from("invoices")
    .select("total, due_date")
    .in("status", ["sent", "overdue"]);

  let current = 0;
  let days30 = 0;
  let days60 = 0;
  let days90plus = 0;

  for (const inv of arInvoices ?? []) {
    if (!inv.due_date) {
      current += Number(inv.total);
      continue;
    }
    const dueDate = new Date(inv.due_date);
    const daysPast = Math.floor(
      (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysPast <= 0) {
      current += Number(inv.total);
    } else if (daysPast <= 30) {
      days30 += Number(inv.total);
    } else if (daysPast <= 60) {
      days60 += Number(inv.total);
    } else {
      days90plus += Number(inv.total);
    }
  }

  const arTotal = current + days30 + days60 + days90plus;
  const arBuckets = [
    {
      label: "Current",
      amount: current,
      pct: arTotal > 0 ? (current / arTotal) * 100 : 0,
      color: "bg-green-500",
    },
    {
      label: "1-30 days",
      amount: days30,
      pct: arTotal > 0 ? (days30 / arTotal) * 100 : 0,
      color: "bg-yellow-500",
    },
    {
      label: "31-60 days",
      amount: days60,
      pct: arTotal > 0 ? (days60 / arTotal) * 100 : 0,
      color: "bg-orange-500",
    },
    {
      label: "90+ days",
      amount: days90plus,
      pct: arTotal > 0 ? (days90plus / arTotal) * 100 : 0,
      color: "bg-red-500",
    },
  ];

  // Get filter options
  const { data: clients } = await supabase
    .from("client_accounts")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  const stats = [
    {
      label: "Invoiced This Month",
      value: formatCurrency(invoicedThisMonth),
      icon: DollarSign,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      label: "Collected This Month",
      value: formatCurrency(paidThisMonth),
      icon: CheckCircle2,
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
    },
    {
      label: "Outstanding",
      value: formatCurrency(totalOutstanding),
      icon: TrendingUp,
      iconBg: "bg-slate-50",
      iconColor: "text-slate-600",
    },
    {
      label: "Overdue",
      value: formatCurrency(totalOverdue),
      icon: AlertCircle,
      iconBg: totalOverdue > 0 ? "bg-red-50" : "bg-green-50",
      iconColor: totalOverdue > 0 ? "text-red-600" : "text-green-600",
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Finance</h1>
          <p className="text-sm text-slate-500">
            Invoices, payments, and accounts receivable
          </p>
        </div>
        <Button asChild>
          <Link href="/finance/new">Create Invoice</Link>
        </Button>
      </div>

      {/* Revenue metrics row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              className="transition-all hover:-translate-y-px hover:shadow-md"
            >
              <CardContent className="flex items-center gap-4 p-5">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.iconBg}`}
                >
                  <Icon className={`h-5 w-5 ${stat.iconColor}`} />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    {stat.label}
                  </p>
                  <p className="text-xl font-bold text-slate-900">
                    {stat.value}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* AR Aging */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Accounts Receivable Aging</CardTitle>
            <span className="text-sm font-semibold text-slate-700">
              {formatCurrency(arTotal)} total
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {/* Stacked bar */}
          <div className="mb-4 flex h-4 overflow-hidden rounded-full bg-slate-100">
            {arBuckets.map(
              (bucket) =>
                bucket.pct > 0 && (
                  <div
                    key={bucket.label}
                    className={`${bucket.color} transition-all`}
                    style={{ width: `${bucket.pct}%` }}
                  />
                )
            )}
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {arBuckets.map((bucket) => (
              <div key={bucket.label} className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-sm ${bucket.color}`} />
                <div>
                  <p className="text-xs font-medium text-slate-600">
                    {bucket.label}
                  </p>
                  <p className="text-sm font-semibold text-slate-900">
                    {formatCurrency(bucket.amount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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
