import { redirect } from "next/navigation";
import { getCurrentUser, createServiceClient } from "@/lib/supabase/server";
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
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AuditFilters } from "./audit-filters";
import { ExportButton } from "./export-button";
import { Shield, Bot, User, ExternalLink } from "lucide-react";

interface SearchParams {
  event_type?: string;
  entity_type?: string;
  actor_type?: string;
  search?: string;
  page?: string;
}

const PAGE_SIZE = 50;

function formatTimestamp(dateStr: string): string {
  const d = new Date(dateStr);
  const date = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${date}, ${time}`;
}

function getEntityLink(entityType: string, entityId: string): string | null {
  switch (entityType) {
    case "entry_case":
      return `/cases/${entityId}`;
    case "task":
      return `/tasks`;
    default:
      return null;
  }
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  created: "bg-emerald-50 text-emerald-700 border-emerald-200",
  updated: "bg-blue-50 text-blue-700 border-blue-200",
  deleted: "bg-red-50 text-red-700 border-red-200",
  status_change: "bg-amber-50 text-amber-700 border-amber-200",
  login: "bg-indigo-50 text-indigo-700 border-indigo-200",
  logout: "bg-slate-100 text-slate-600 border-slate-200",
  upload: "bg-violet-50 text-violet-700 border-violet-200",
  download: "bg-cyan-50 text-cyan-700 border-cyan-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

function getEventColor(eventType: string): string {
  return EVENT_TYPE_COLORS[eventType] ?? "bg-slate-50 text-slate-600 border-slate-200";
}

function formatDetails(details: unknown): string | null {
  if (!details || (typeof details === "object" && Object.keys(details as object).length === 0)) {
    return null;
  }
  try {
    return JSON.stringify(details, null, 2);
  } catch {
    return null;
  }
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await getCurrentUser();

  // Role check: only admin and broker_lead
  if (!user || !["admin", "broker_lead"].includes(user.role)) {
    redirect("/dashboard");
  }

  const supabase = createServiceClient();
  const page = parseInt(searchParams.page ?? "1", 10);
  const offset = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("audit_events")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (searchParams.event_type) {
    query = query.eq("event_type", searchParams.event_type);
  }
  if (searchParams.entity_type) {
    query = query.eq("entity_type", searchParams.entity_type);
  }
  if (searchParams.actor_type) {
    query = query.eq("actor_type", searchParams.actor_type);
  }
  if (searchParams.search) {
    query = query.or(`entity_id.eq.${searchParams.search},action.ilike.%${searchParams.search}%`);
  }

  query = query.range(offset, offset + PAGE_SIZE - 1);

  const { data: events, count } = await query;
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  // Get distinct event types and entity types for filter dropdowns
  const { data: allEvents } = await supabase
    .from("audit_events")
    .select("event_type, entity_type")
    .limit(1000);

  const eventTypes = Array.from(new Set(allEvents?.map((e) => e.event_type) ?? [])).sort();
  const entityTypes = Array.from(new Set(allEvents?.map((e) => e.entity_type) ?? [])).sort();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
            <Shield className="h-5 w-5 text-slate-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Audit Trail</h1>
            <p className="text-sm text-slate-500">
              <span className="font-medium text-slate-600">{count ?? 0}</span> events recorded
            </p>
          </div>
        </div>
        <ExportButton searchParams={{
          event_type: searchParams.event_type,
          entity_type: searchParams.entity_type,
          actor_type: searchParams.actor_type,
          search: searchParams.search,
        }} />
      </div>

      {/* Filters */}
      <AuditFilters
        eventTypes={eventTypes}
        entityTypes={entityTypes}
        currentFilters={{
          event_type: searchParams.event_type,
          entity_type: searchParams.entity_type,
          actor_type: searchParams.actor_type,
          search: searchParams.search,
        }}
      />

      {/* Events Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80">
                <TableHead className="font-semibold w-[180px]">Timestamp</TableHead>
                <TableHead className="font-semibold w-[100px]">Actor</TableHead>
                <TableHead className="font-semibold w-[120px]">Event Type</TableHead>
                <TableHead className="font-semibold">Action</TableHead>
                <TableHead className="font-semibold w-[140px]">Entity</TableHead>
                <TableHead className="font-semibold">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events && events.length > 0 ? (
                events.map((event) => {
                  const entityLink = getEntityLink(event.entity_type, event.entity_id);
                  const detailsStr = formatDetails(event.details);
                  return (
                    <TableRow key={event.id} className="hover:bg-slate-50/50 transition-colors group">
                      <TableCell className="whitespace-nowrap">
                        <div className="text-sm text-slate-700">
                          {new Date(event.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                        <div className="text-xs text-slate-400">
                          {new Date(event.created_at).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        {event.actor_type === "agent" ? (
                          <Badge className="bg-violet-100 text-violet-700 border border-violet-200 text-xs font-medium hover:bg-violet-100">
                            <Bot className="h-3 w-3 mr-1" />
                            AI
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs font-medium text-slate-600">
                            <User className="h-3 w-3 mr-1" />
                            {event.actor_type}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs font-medium border ${getEventColor(event.event_type)}`}>
                          {event.event_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-700 max-w-xs">
                        <span className="line-clamp-2">{event.action}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="secondary" className="text-xs font-mono bg-slate-100 text-slate-600">
                            {event.entity_type}
                          </Badge>
                          {entityLink && (
                            <Link href={entityLink} className="text-blue-600 hover:text-blue-800 transition-colors">
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {detailsStr ? (
                          <details className="group/details">
                            <summary className="cursor-pointer text-xs text-slate-400 hover:text-slate-600 transition-colors">
                              View details
                            </summary>
                            <pre className="mt-2 rounded-md bg-slate-50 border border-slate-200 p-2 text-xs text-slate-600 max-w-sm overflow-x-auto whitespace-pre-wrap">
                              {detailsStr}
                            </pre>
                          </details>
                        ) : (
                          <span className="text-xs text-slate-300">--</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Shield className="h-8 w-8 text-slate-300" />
                      <p className="text-sm font-medium text-slate-500">No audit events found</p>
                      <p className="text-xs text-slate-400">Try adjusting your filters</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
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
                  href={{ pathname: "/audit", query: { ...searchParams, page: String(page - 1) } }}
                >
                  Previous
                </Link>
              </Button>
            )}
            {page < totalPages && (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={{ pathname: "/audit", query: { ...searchParams, page: String(page + 1) } }}
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
