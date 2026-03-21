import { createClient, createServiceClient } from "./server";

interface AuthResult {
  userId: string;
  tenantId: string;
  role: string;
  isLicensedBroker: boolean;
  fullName: string;
}

/**
 * Authenticate an API route request using the session cookie.
 * Returns user profile info or null if not authenticated.
 * Uses getSession() to read from cookie + service client to fetch profile.
 */
export async function authenticateApiRequest(): Promise<AuthResult | null> {
  const supabase = createClient();

  let userId: string | null = null;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    userId = session?.user?.id ?? null;
  } catch {
    return null;
  }

  if (!userId) return null;

  const serviceClient = createServiceClient();
  const { data: profile } = await serviceClient
    .from("users")
    .select("id, tenant_id, role, is_licensed_broker, full_name")
    .eq("id", userId)
    .single();

  if (!profile) return null;

  return {
    userId: profile.id,
    tenantId: profile.tenant_id,
    role: profile.role,
    isLicensedBroker: profile.is_licensed_broker,
    fullName: profile.full_name,
  };
}
