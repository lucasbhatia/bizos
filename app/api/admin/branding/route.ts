import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from '@/lib/supabase/auth-api';
import { createServiceClient } from '@/lib/supabase/server';
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
  const auth = await authenticateApiRequest();
  if (!auth || auth.role !== 'admin') return null;
  const supabase = createServiceClient();
  return { supabase, auth };
}

export async function GET() {
  const result = await getAdminWithTenant();
  if (!result) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { supabase, auth } = result;

  const { data: tenant } = await supabase
    .from("tenants")
    .select("settings")
    .eq("id", auth.tenantId)
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

  const { supabase, auth } = result;

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
    .eq("id", auth.tenantId)
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
    .eq("id", auth.tenantId);

  if (error) {
    return NextResponse.json(
      { error: "Failed to save branding settings" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
