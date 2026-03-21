import { createServiceClient } from "@/lib/supabase/server";
import { NewCaseWizard } from "./new-case-wizard";

export default async function NewCasePage() {
  const supabase = createServiceClient();

  const [clientsRes, usersRes, busUnitsRes] = await Promise.all([
    supabase.from("client_accounts").select("id, name").eq("is_active", true).order("name"),
    supabase.from("users").select("id, full_name, role").eq("is_active", true).order("full_name"),
    supabase.from("business_units").select("id, name").eq("is_active", true).order("name"),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">New Case</h1>
      <NewCaseWizard
        clients={clientsRes.data ?? []}
        users={usersRes.data ?? []}
        businessUnits={busUnitsRes.data ?? []}
      />
    </div>
  );
}
