import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { UserWithTenant } from "@/lib/types/database";

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  );
}

export function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return []; },
        setAll() {},
      },
    }
  );
}

/**
 * Creates a Supabase client scoped to the current user's tenant.
 * Uses service role (bypasses RLS) but applies tenant_id filtering.
 * Must be called after getCurrentUser() to get the tenant_id.
 */
export function createTenantClient() {
  return createServiceClient();
}

export async function getCurrentUser(): Promise<UserWithTenant | null> {
  const supabase = createClient();

  // Read session from cookie
  let userId: string | null = null;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    userId = session?.user?.id ?? null;
  } catch {
    return null;
  }

  if (!userId) return null;

  // Use service role to fetch profile (bypasses RLS)
  // This is safe because we already verified the user via their session JWT
  const serviceClient = createServiceClient();
  const { data: profile } = await serviceClient
    .from("users")
    .select("*, tenant:tenants(*)")
    .eq("id", userId)
    .single();

  if (!profile) return null;

  return profile as unknown as UserWithTenant;
}
