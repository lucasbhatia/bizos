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

  // Try getUser() first (validates with Supabase Auth server)
  // Fall back to getSession() if getUser() fails (reads from cookie directly)
  let userId: string | null = null;

  try {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    userId = authUser?.id ?? null;
  } catch {
    // getUser() failed — try getSession() as fallback
  }

  if (!userId) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      userId = session?.user?.id ?? null;
    } catch {
      // Both failed
    }
  }

  if (!userId) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("*, tenant:tenants(*)")
    .eq("id", userId)
    .single();

  if (!profile) return null;

  return profile as unknown as UserWithTenant;
}
