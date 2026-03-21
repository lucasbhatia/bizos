import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from '@/lib/supabase/auth-api';
import { createServiceClient } from '@/lib/supabase/server';
import { z } from "zod";

const createTenantSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  adminEmail: z.string().email(),
  adminName: z.string().min(1).max(255),
  adminPassword: z.string().min(8),
});

async function requireAdmin() {
  const auth = await authenticateApiRequest();
  if (!auth || auth.role !== "admin") return null;
  return auth;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const service = createServiceClient();

  // Fetch all tenants
  const { data: tenants, error: tenantErr } = await service
    .from("tenants")
    .select("id, name, slug, created_at")
    .order("created_at", { ascending: false });

  if (tenantErr) {
    return NextResponse.json(
      { error: tenantErr.message },
      { status: 500 }
    );
  }

  // Fetch user counts per tenant
  const { data: userCounts } = await service
    .from("users")
    .select("tenant_id");

  // Fetch case counts per tenant
  const { data: caseCounts } = await service
    .from("entry_cases")
    .select("tenant_id");

  // Fetch agent invocation count
  const { data: agentLogs } = await service
    .from("ai_action_logs")
    .select("id");

  // Aggregate counts
  const userCountMap = new Map<string, number>();
  const caseCountMap = new Map<string, number>();

  if (userCounts) {
    for (const u of userCounts) {
      userCountMap.set(u.tenant_id, (userCountMap.get(u.tenant_id) ?? 0) + 1);
    }
  }
  if (caseCounts) {
    for (const c of caseCounts) {
      caseCountMap.set(c.tenant_id, (caseCountMap.get(c.tenant_id) ?? 0) + 1);
    }
  }

  const tenantsWithStats = (tenants ?? []).map((t) => ({
    ...t,
    user_count: userCountMap.get(t.id) ?? 0,
    case_count: caseCountMap.get(t.id) ?? 0,
  }));

  let totalUsers = 0;
  let totalCases = 0;
  userCountMap.forEach((val) => { totalUsers += val; });
  caseCountMap.forEach((val) => { totalCases += val; });

  return NextResponse.json({
    tenants: tenantsWithStats,
    analytics: {
      total_users: totalUsers,
      total_cases: totalCases,
      total_agent_invocations: agentLogs?.length ?? 0,
    },
  });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createTenantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { name, slug, adminEmail, adminName, adminPassword } = parsed.data;
  const service = createServiceClient();

  // Check if slug is unique
  const { data: existing } = await service
    .from("tenants")
    .select("id")
    .eq("slug", slug)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "A tenant with this slug already exists" },
      { status: 409 }
    );
  }

  // Create the tenant
  const { data: tenant, error: tenantErr } = await service
    .from("tenants")
    .insert({
      name,
      slug,
      timezone: "America/New_York",
      data_region: "us-east-1",
      settings: {},
    })
    .select("id")
    .single();

  if (tenantErr || !tenant) {
    return NextResponse.json(
      { error: tenantErr?.message ?? "Failed to create tenant" },
      { status: 500 }
    );
  }

  // Create the auth user via admin API
  const { data: authData, error: authErr } =
    await service.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
    });

  if (authErr || !authData.user) {
    // Rollback tenant
    await service.from("tenants").delete().eq("id", tenant.id);
    return NextResponse.json(
      { error: authErr?.message ?? "Failed to create admin user" },
      { status: 500 }
    );
  }

  // Create the user profile
  const { error: profileErr } = await service.from("users").insert({
    id: authData.user.id,
    tenant_id: tenant.id,
    email: adminEmail,
    full_name: adminName,
    role: "admin",
    is_licensed_broker: false,
    is_active: true,
  });

  if (profileErr) {
    return NextResponse.json(
      { error: profileErr.message },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { id: tenant.id, name, slug },
    { status: 201 }
  );
}
