import { NextRequest, NextResponse } from "next/server";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !["admin", "broker_lead"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const supabase = createClient();
  const { searchParams } = request.nextUrl;

  let query = supabase
    .from("audit_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10000);

  const eventType = searchParams.get("event_type");
  const entityType = searchParams.get("entity_type");
  const actorType = searchParams.get("actor_type");
  const search = searchParams.get("search");

  if (eventType) query = query.eq("event_type", eventType);
  if (entityType) query = query.eq("entity_type", entityType);
  if (actorType) query = query.eq("actor_type", actorType);
  if (search) query = query.or(`entity_id.eq.${search},action.ilike.%${search}%`);

  const { data: events } = await query;

  if (!events || events.length === 0) {
    return new NextResponse("No data", { status: 200 });
  }

  // Build CSV
  const headers = ["timestamp", "event_type", "entity_type", "entity_id", "actor_type", "actor_id", "action", "details"];
  const rows = events.map((e) => [
    e.created_at,
    e.event_type,
    e.entity_type,
    e.entity_id,
    e.actor_type,
    e.actor_id,
    `"${(e.action ?? "").replace(/"/g, '""')}"`,
    `"${JSON.stringify(e.details ?? {}).replace(/"/g, '""')}"`,
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename=audit-export.csv`,
    },
  });
}
