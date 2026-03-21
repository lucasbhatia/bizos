import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface TenantSettings {
  soc2_checklist?: unknown;
  [key: string]: unknown;
}

// GET: Load SOC 2 checklist from tenant settings
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

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("settings")
    .eq("id", profile.tenant_id)
    .single();

  const settings = (tenant?.settings ?? {}) as TenantSettings;

  return NextResponse.json({ checklist: settings.soc2_checklist ?? null });
}

// POST: Save SOC 2 checklist to tenant settings
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

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { checklist: unknown };
  try {
    body = (await request.json()) as { checklist: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Get current settings and merge
  const { data: tenant } = await supabase
    .from("tenants")
    .select("settings")
    .eq("id", profile.tenant_id)
    .single();

  const settings = (tenant?.settings ?? {}) as TenantSettings;
  settings.soc2_checklist = body.checklist;

  const { error } = await supabase
    .from("tenants")
    .update({ settings })
    .eq("id", profile.tenant_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
