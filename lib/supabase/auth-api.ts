import { createClient, createServiceClient } from "./server";

export interface AuthResult {
  userId: string;
  tenantId: string;
  role: string;
  isLicensedBroker: boolean;
  fullName: string;
}

/**
 * Authenticate an API route request.
 * Uses getUser() (validates JWT with Supabase Auth server).
 */
export async function authenticateApiRequest(): Promise<AuthResult | null> {
  const supabase = await createClient();

  const { data: { user: authUser }, error } = await supabase.auth.getUser();
  if (error || !authUser) return null;

  const serviceClient = createServiceClient();
  const { data: profile } = await serviceClient
    .from("users")
    .select("id, tenant_id, role, is_licensed_broker, full_name")
    .eq("id", authUser.id)
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

type UserRole = 'admin' | 'broker_lead' | 'ops_manager' | 'specialist' | 'finance' | 'viewer';

export function hasRole(auth: AuthResult, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(auth.role as UserRole);
}
