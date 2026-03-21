import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { UserWithTenant } from "@/lib/types/database";

export async function createClient() {
  const cookieStore = await cookies();

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
            // setAll called from Server Component — safe to ignore
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
  const supabase = await createClient();

  const { data: { user: authUser }, error } = await supabase.auth.getUser();
  if (error || !authUser) return null;

  // Use service role to fetch profile (bypasses RLS for reliability)
  const serviceClient = createServiceClient();
  const { data: profile } = await serviceClient
    .from("users")
    .select("*, tenant:tenants(*)")
    .eq("id", authUser.id)
    .single();

  if (!profile) return null;
  return profile as unknown as UserWithTenant;
}
