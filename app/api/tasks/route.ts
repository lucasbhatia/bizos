import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createTaskSchema } from "@/lib/validators/schemas";
import { z } from "zod";

export async function POST(request: NextRequest) {
  const supabase = createClient();

  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("tenant_id")
    .eq("id", authUser.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      tenant_id: profile.tenant_id,
      ...parsed.data,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Audit event
  await supabase.from("audit_events").insert({
    tenant_id: profile.tenant_id,
    event_type: "task.created",
    entity_type: "task",
    entity_id: task.id,
    actor_type: "user",
    actor_id: authUser.id,
    action: `Created task: ${parsed.data.title}`,
    details: { task_type: parsed.data.task_type, case_id: parsed.data.entry_case_id },
  });

  return NextResponse.json({ success: true, task });
}

const patchSchema = z.object({
  task_id: z.string().uuid(),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  assigned_user_id: z.string().uuid().optional(),
});

export async function PATCH(request: NextRequest) {
  const supabase = createClient();

  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const { task_id, ...updates } = parsed.data;

  // Add completed_at if marking complete
  const dbUpdates: Record<string, unknown> = { ...updates };
  if (updates.status === "completed") {
    dbUpdates.completed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("tasks")
    .update(dbUpdates)
    .eq("id", task_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Audit
  const { data: profile } = await supabase
    .from("users")
    .select("tenant_id")
    .eq("id", authUser.id)
    .single();

  if (profile) {
    const actionParts: string[] = [];
    if (updates.status) actionParts.push(`status → ${updates.status}`);
    if (updates.priority) actionParts.push(`priority → ${updates.priority}`);
    if (updates.assigned_user_id) actionParts.push("reassigned");

    await supabase.from("audit_events").insert({
      tenant_id: profile.tenant_id,
      event_type: "task.updated",
      entity_type: "task",
      entity_id: task_id,
      actor_type: "user",
      actor_id: authUser.id,
      action: `Updated task: ${actionParts.join(", ")}`,
      details: updates,
    });
  }

  return NextResponse.json({ success: true });
}
