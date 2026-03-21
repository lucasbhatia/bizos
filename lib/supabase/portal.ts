import { createClient } from "@/lib/supabase/server";
import type { Contact, ClientAccount } from "@/lib/types/database";

/**
 * Portal user: a client contact who logs in via Supabase Auth.
 * We match auth user email -> contacts.email to find their linked client_account.
 *
 * RLS NOTE: The existing RLS policies filter rows by tenant_id derived from the
 * users table (internal staff). For portal users who are NOT in the users table,
 * RLS policies on entry_cases, documents, etc. will need an additional path:
 *   - A policy that allows SELECT when the authenticated user's email matches
 *     a contact's email AND the row's client_account_id matches that contact's
 *     client_account_id.
 *   - Alternatively, create a "portal_users" table or add auth_user_id to contacts.
 *   - Until those policies are added, portal queries use the service client or
 *     rely on application-level filtering shown here.
 */

export interface PortalUser {
  user: { id: string; email: string };
  contact: Contact;
  clientAccount: ClientAccount;
}

export async function getPortalUser(): Promise<PortalUser | null> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.email) return null;

  // Find the contact record whose email matches the authenticated user
  const { data: contact } = await supabase
    .from("contacts")
    .select("*")
    .eq("email", authUser.email)
    .limit(1)
    .single();

  if (!contact) return null;

  // Fetch the linked client account
  const { data: clientAccount } = await supabase
    .from("client_accounts")
    .select("*")
    .eq("id", contact.client_account_id)
    .single();

  if (!clientAccount) return null;

  return {
    user: { id: authUser.id, email: authUser.email },
    contact: contact as Contact,
    clientAccount: clientAccount as ClientAccount,
  };
}
