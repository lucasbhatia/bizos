import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const brandingSchema = z.object({
  primary_color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color")
    .optional(),
  secondary_color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color")
    .optional(),
  company_name: z.string().min(1).max(255).optional(),
  logo_url: z.string().url().optional().or(z.literal("")),
});

async function getAdminWithTenant() {
  const supabase = createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("id, tenant_id, role")
    .eq("id", authUser.id)
    .single();

  if (!profile || profile.role !== "admin") return null;
  return { supabase, profile };
}

export async function GET() {
  const result = await getAdminWithTenant();
  if (!result) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { supabase, profile } = result;

  const { data: tenant } = await supabase
    .from("tenants")
    .select("settings")
    .eq("id", profile.tenant_id)
    .single();

  const settings = (tenant?.settings ?? {}) as Record<string, unknown>;
  const branding = (settings.branding ?? {}) as Record<string, unknown>;

  return NextResponse.json({
    primary_color: (branding.primary_color as string) ?? "#2563EB",
    secondary_color: (branding.secondary_color as string) ?? "#0D9488",
    company_name: (branding.company_name as string) ?? "",
    logo_url: (branding.logo_url as string) ?? "",
  });
}

export async function POST(request: NextRequest) {
  const result = await getAdminWithTenant();
  if (!result) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { supabase, profile } = result;

  const body: unknown = await request.json();
  const parsed = brandingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Read current settings
  const { data: tenant } = await supabase
    .from("tenants")
    .select("settings")
    .eq("id", profile.tenant_id)
    .single();

  const currentSettings = (tenant?.settings ?? {}) as Record<string, unknown>;

  const updatedSettings = {
    ...currentSettings,
    branding: {
      ...((currentSettings.branding ?? {}) as Record<string, unknown>),
      ...parsed.data,
    },
  };

  const { error } = await supabase
    .from("tenants")
    .update({ settings: updatedSettings })
    .eq("id", profile.tenant_id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to save branding settings" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
