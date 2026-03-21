import { createServiceClient } from "@/lib/supabase/server";
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
  Plus,
  Receipt,
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
  const supabase = createServiceClient();
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
      color: "bg-emerald-500",
      dotColor: "bg-emerald-500",
      textColor: "text-emerald-700",
    },
    {
      label: "1-30 days",
      amount: days30,
      pct: arTotal > 0 ? (days30 / arTotal) * 100 : 0,
      color: "bg-amber-400",
      dotColor: "bg-amber-400",
      textColor: "text-amber-700",
    },
    {
      label: "31-60 days",
      amount: days60,
      pct: arTotal > 0 ? (days60 / arTotal) * 100 : 0,
      color: "bg-orange-500",
      dotColor: "bg-orange-500",
      textColor: "text-orange-700",
    },
    {
      label: "90+ days",
      amount: days90plus,
      pct: arTotal > 0 ? (days90plus / arTotal) * 100 : 0,
      color: "bg-red-500",
      dotColor: "bg-red-500",
      textColor: "text-red-700",
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
      borderColor: "border-l-blue-500",
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      label: "Collected This Month",
      value: formatCurrency(paidThisMonth),
      icon: CheckCircle2,
      borderColor: "border-l-emerald-500",
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      label: "Outstanding",
      value: formatCurrency(totalOutstanding),
      icon: TrendingUp,
      borderColor: "border-l-slate-400",
      iconBg: "bg-slate-50",
      iconColor: "text-slate-600",
    },
    {
      label: "Overdue",
      value: formatCurrency(totalOverdue),
      icon: AlertCircle,
      borderColor: totalOverdue > 0 ? "border-l-red-500" : "border-l-emerald-500",
      iconBg: totalOverdue > 0 ? "bg-red-50" : "bg-emerald-50",
      iconColor: totalOverdue > 0 ? "text-red-600" : "text-emerald-600",
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
            <Receipt className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Finance</h1>
            <p className="text-sm text-slate-500">
              Invoices, payments, and accounts receivable
            </p>
          </div>
        </div>
        <Button asChild className="shadow-sm">
          <Link href="/finance/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Invoice
          </Link>
        </Button>
      </div>

      {/* Revenue metrics row with colored left borders */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              className={`border-l-4 ${stat.borderColor} transition-all hover:-translate-y-px hover:shadow-md`}
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
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-slate-900">
              Accounts Receivable Aging
            </CardTitle>
            <span className="text-sm font-bold text-slate-700">
              {formatCurrency(arTotal)} total
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {/* Stacked bar */}
          <div className="mb-5 flex h-5 overflow-hidden rounded-full bg-slate-100">
            {arBuckets.map(
              (bucket) =>
                bucket.pct > 0 && (
                  <div
                    key={bucket.label}
                    className={`${bucket.color} transition-all duration-500 first:rounded-l-full last:rounded-r-full`}
                    style={{ width: `${bucket.pct}%` }}
                    title={`${bucket.label}: ${formatCurrency(bucket.amount)}`}
                  />
                )
            )}
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {arBuckets.map((bucket) => (
              <div key={bucket.label} className="flex items-center gap-2.5">
                <div className={`h-3 w-3 rounded-full ${bucket.dotColor} flex-shrink-0`} />
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    {bucket.label}
                  </p>
                  <p className={`text-sm font-bold ${bucket.amount > 0 ? bucket.textColor : "text-slate-400"}`}>
                    {formatCurrency(bucket.amount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <InvoicesFilters
        clients={clients ?? []}
        currentFilters={{
          status: searchParams.status,
          client: searchParams.client,
          from: searchParams.from,
          to: searchParams.to,
        }}
      />

      {/* Invoice Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <InvoicesTable invoices={invoices ?? []} />
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
          <p className="text-sm text-slate-500">
            Page <span className="font-medium text-slate-700">{page}</span> of{" "}
            <span className="font-medium text-slate-700">{totalPages}</span>
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
