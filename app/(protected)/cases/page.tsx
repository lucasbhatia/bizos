import { createServiceClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { STATUS_COLORS, PRIORITY_COLORS } from "@/lib/types/database";
import type { CaseStatus, PriorityLevel } from "@/lib/types/database";
import { CasesFilters } from "./cases-filters";
import { CasesTable } from "./cases-table";
import { KanbanView } from "./kanban-view";
import { ViewToggle } from "./view-toggle";
import { StatusGuide } from "@/components/status-guide";
import { Plus, Briefcase } from "lucide-react";

interface SearchParams {
  status?: string;
  priority?: string;
  client?: string;
  assignee?: string;
  search?: string;
  sort?: string;
  order?: string;
  page?: string;
  view?: string;
}

const PAGE_SIZE = 25;

function formatLabel(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export default async function CasesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = createServiceClient();
  const page = parseInt(searchParams.page ?? "1", 10);
  const offset = (page - 1) * PAGE_SIZE;
  const sortField = searchParams.sort ?? "created_at";
  const sortOrder = searchParams.order === "asc";
  const viewMode = searchParams.view ?? "table";

  // Build query
  let query = supabase
    .from("entry_cases")
    .select(
      "*, client_account:client_accounts(id, name), assigned_user:users(id, full_name)",
      { count: "exact" }
    );

  // Apply filters
  if (searchParams.status) {
    const statuses = searchParams.status.split(",");
    query = query.in("status", statuses);
  }

  if (searchParams.priority) {
    const priorities = searchParams.priority.split(",");
    query = query.in("priority", priorities);
  }

  if (searchParams.client) {
    query = query.eq("client_account_id", searchParams.client);
  }

  if (searchParams.assignee) {
    query = query.eq("assigned_user_id", searchParams.assignee);
  }

  if (searchParams.search) {
    query = query.or(`case_number.ilike.%${searchParams.search}%`);
  }

  // Sort and paginate
  query = query
    .order(sortField, { ascending: sortOrder })
    .range(offset, offset + PAGE_SIZE - 1);

  const { data: cases, count } = await query;

  // Get filter options
  const [clientsRes, usersRes] = await Promise.all([
    supabase
      .from("client_accounts")
      .select("id, name")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("users")
      .select("id, full_name")
      .eq("is_active", true)
      .order("full_name"),
  ]);

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  // Determine active filters for chip display
  const activeFilters: { key: string; label: string; value: string }[] = [];
  if (searchParams.status) {
    searchParams.status.split(",").forEach((s) => {
      activeFilters.push({
        key: "status",
        label: formatLabel(s),
        value: s,
      });
    });
  }
  if (searchParams.priority) {
    searchParams.priority.split(",").forEach((p) => {
      activeFilters.push({
        key: "priority",
        label: formatLabel(p),
        value: p,
      });
    });
  }
  if (searchParams.client) {
    const clientName =
      clientsRes.data?.find((c) => c.id === searchParams.client)?.name ??
      "Client";
    activeFilters.push({
      key: "client",
      label: clientName,
      value: searchParams.client,
    });
  }
  if (searchParams.assignee) {
    const userName =
      usersRes.data?.find((u) => u.id === searchParams.assignee)?.full_name ??
      "User";
    activeFilters.push({
      key: "assignee",
      label: userName,
      value: searchParams.assignee,
    });
  }
  if (searchParams.search) {
    activeFilters.push({
      key: "search",
      label: `"${searchParams.search}"`,
      value: searchParams.search,
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Cases
              </h1>
              <Badge
                variant="secondary"
                className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600"
              >
                {count ?? 0}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Manage and track customs entry cases
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ViewToggle currentView={viewMode} />
          <Button asChild className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-sm">
            <Link href="/cases/new">
              <Plus className="h-4 w-4" />
              New Case
            </Link>
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <CasesFilters
        clients={clientsRes.data ?? []}
        users={usersRes.data ?? []}
        currentFilters={{
          status: searchParams.status,
          priority: searchParams.priority,
          client: searchParams.client,
          assignee: searchParams.assignee,
          search: searchParams.search,
        }}
        activeFilters={activeFilters}
      />

      {/* Status Guide */}
      <StatusGuide />

      {/* Content */}
      {(cases ?? []).length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white py-20 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <Briefcase className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-700">
            No cases yet
          </h3>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-400">
            Create your first customs entry case to get started
          </p>
          <Button asChild className="mt-5 gap-2 bg-blue-600 hover:bg-blue-700 shadow-sm">
            <Link href="/cases/new">
              <Plus className="h-4 w-4" />
              Create Case
            </Link>
          </Button>
        </div>
      ) : viewMode === "kanban" ? (
        <KanbanView cases={cases ?? []} />
      ) : (
        <CasesTable
          cases={cases ?? []}
          currentSort={sortField}
          currentOrder={searchParams.order ?? "desc"}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && viewMode === "table" && (
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
          <p className="text-sm text-slate-500">
            Page <span className="font-medium text-slate-700">{page}</span> of{" "}
            <span className="font-medium text-slate-700">{totalPages}</span>
            <span className="ml-2 text-slate-400">
              ({count} total {count === 1 ? "case" : "cases"})
            </span>
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={{
                    pathname: "/cases",
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
                    pathname: "/cases",
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
