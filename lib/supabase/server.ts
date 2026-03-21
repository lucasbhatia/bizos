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

export async function getCurrentUser(): Promise<UserWithTenant | null> {
  const supabase = createClient();

  // Use getSession() — reads directly from cookie, no API call
  // This is reliable in server components where cookies are available
  let userId: string | null = null;
  let userEmail: string | null = null;
  let userRole: string = "viewer";

  try {
    const { data: { session } } = await supabase.auth.getSession();
    userId = session?.user?.id ?? null;
    userEmail = session?.user?.email ?? null;
  } catch {
    // Cookie unreadable
    return null;
  }

  if (!userId) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("*, tenant:tenants(*)")
    .eq("id", userId)
    .single();

  if (profile) {
    return profile as unknown as UserWithTenant;
  }

  // Profile not found in public.users — return a minimal user object
  // This happens when auth.users exists but public.users row is missing
  // (e.g., newly signed up user before profile creation)
  return {
    id: userId,
    tenant_id: "",
    email: userEmail ?? "",
    full_name: userEmail?.split("@")[0] ?? "User",
    role: userRole as UserWithTenant["role"],
    is_licensed_broker: false,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}
