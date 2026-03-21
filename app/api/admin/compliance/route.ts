import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from '@/lib/supabase/auth-api';
import { createServiceClient } from '@/lib/supabase/server';

interface TenantSettings {
  soc2_checklist?: unknown;
  [key: string]: unknown;
}

// GET: Load SOC 2 checklist from tenant settings
export async function GET() {
  const auth = await authenticateApiRequest();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data: tenant } = await supabase
    .from("tenants")
    .select("settings")
    .eq("id", auth.tenantId)
    .single();

  const settings = (tenant?.settings ?? {}) as TenantSettings;

  return NextResponse.json({ checklist: settings.soc2_checklist ?? null });
}

// POST: Save SOC 2 checklist to tenant settings
export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
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
    .eq("id", auth.tenantId)
    .single();

  const settings = (tenant?.settings ?? {}) as TenantSettings;
  settings.soc2_checklist = body.checklist;

  const { error } = await supabase
    .from("tenants")
    .update({ settings })
    .eq("id", auth.tenantId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
