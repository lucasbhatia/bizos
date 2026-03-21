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
import Link from "next/link";
import { AuditFilters } from "./audit-filters";
import { ExportButton } from "./export-button";

interface SearchParams {
  event_type?: string;
  entity_type?: string;
  actor_type?: string;
  search?: string;
  page?: string;
}

const PAGE_SIZE = 50;

function formatTimestamp(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Audit Trail</h1>
          <p className="text-sm text-slate-500">{count ?? 0} events</p>
        </div>
        <ExportButton searchParams={{
          event_type: searchParams.event_type,
          entity_type: searchParams.entity_type,
          actor_type: searchParams.actor_type,
          search: searchParams.search,
        }} />
      </div>

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

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events && events.length > 0 ? (
                events.map((event) => {
                  const entityLink = getEntityLink(event.entity_type, event.entity_id);
                  return (
                    <TableRow key={event.id}>
                      <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                        {formatTimestamp(event.created_at)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={event.actor_type === "agent" ? "default" : "outline"}
                          className="text-xs"
                        >
                          {event.actor_type === "agent" ? "AI" : event.actor_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm max-w-xs truncate">
                        {event.action}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Badge variant="secondary" className="text-xs">
                            {event.entity_type}
                          </Badge>
                          {entityLink ? (
                            <Link href={entityLink} className="text-xs text-blue-600 hover:underline">
                              View
                            </Link>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 max-w-48 truncate">
                        {JSON.stringify(event.details)}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-500 py-8">
                    No audit events found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={{ pathname: "/audit", query: { ...searchParams, page: String(page - 1) } }}
                className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:bg-slate-50"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={{ pathname: "/audit", query: { ...searchParams, page: String(page + 1) } }}
                className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:bg-slate-50"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
