import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// ============================================================================
// Scheduled reports — stored in tenant settings
// ============================================================================

const scheduleSchema = z.object({
  name: z.string().min(1).max(100),
  frequency: z.enum(["daily", "weekly", "monthly"]),
  reportConfig: z.object({
    source: z.enum(["cases", "tasks", "invoices", "documents", "agent_logs"]),
    columns: z.array(z.string()).min(1),
    filters: z.array(
      z.object({
        column: z.string(),
        operator: z.string(),
        value: z.string(),
      })
    ),
    sort: z
      .object({
        column: z.string(),
        direction: z.enum(["asc", "desc"]),
      })
      .nullable(),
  }),
  recipientEmails: z.array(z.string().email()).default([]),
});

interface ScheduledReport {
  id: string;
  name: string;
  frequency: string;
  reportConfig: {
    source: string;
    columns: string[];
    filters: { column: string; operator: string; value: string }[];
    sort: { column: string; direction: string } | null;
  };
  recipientEmails: string[];
  created_at: string;
}

interface TenantSettings {
  scheduled_reports?: ScheduledReport[];
  [key: string]: unknown;
}

async function getTenantSettings(
  supabase: ReturnType<typeof createClient>,
  tenantId: string
): Promise<TenantSettings> {
  const { data } = await supabase
    .from("tenants")
    .select("settings")
    .eq("id", tenantId)
    .single();
  return (data?.settings ?? {}) as TenantSettings;
}

async function updateTenantSettings(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  settings: TenantSettings
) {
  await supabase
    .from("tenants")
    .update({ settings })
    .eq("id", tenantId);
}

// GET: List saved schedules
export async function GET() {
  const supabase = createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("tenant_id, role")
    .eq("id", authUser.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Only admin / broker_lead / ops_manager
  if (!["admin", "broker_lead", "ops_manager"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const settings = await getTenantSettings(supabase, profile.tenant_id);
  const schedules = settings.scheduled_reports ?? [];

  return NextResponse.json({ schedules });
}

// POST: Save a new schedule
export async function POST(request: NextRequest) {
  const supabase = createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("tenant_id, role")
    .eq("id", authUser.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  if (!["admin", "broker_lead", "ops_manager"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = scheduleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const settings = await getTenantSettings(supabase, profile.tenant_id);
  const schedules: ScheduledReport[] = settings.scheduled_reports ?? [];

  const newSchedule: ScheduledReport = {
    id: crypto.randomUUID(),
    name: parsed.data.name,
    frequency: parsed.data.frequency,
    reportConfig: parsed.data.reportConfig,
    recipientEmails: parsed.data.recipientEmails,
    created_at: new Date().toISOString(),
  };

  schedules.push(newSchedule);
  settings.scheduled_reports = schedules;

  await updateTenantSettings(supabase, profile.tenant_id, settings);

  return NextResponse.json({ schedule: newSchedule }, { status: 201 });
}
