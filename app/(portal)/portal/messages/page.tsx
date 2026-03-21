import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/supabase/portal";
import { createClient } from "@/lib/supabase/server";
import { PortalMessagesClient } from "./messages-client";

export default async function PortalMessagesPage() {
  const portalUser = await getPortalUser();
  if (!portalUser) redirect("/login");

  const supabase = createClient();

  // Fetch all messages for this client account
  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("client_account_id", portalUser.clientAccount.id)
    .order("created_at", { ascending: true });

  // Fetch cases for this client so we can show case numbers
  const { data: cases } = await supabase
    .from("entry_cases")
    .select("id, case_number, status")
    .eq("client_account_id", portalUser.clientAccount.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Messages</h1>
        <p className="text-sm text-slate-500">
          Communicate with your customs broker team
        </p>
      </div>

      <PortalMessagesClient
        initialMessages={messages ?? []}
        cases={cases ?? []}
        clientAccountId={portalUser.clientAccount.id}
        tenantId={portalUser.clientAccount.tenant_id}
        currentUser={{
          id: portalUser.user.id,
          name: portalUser.contact.name,
          senderType: "client",
        }}
      />
    </div>
  );
}
