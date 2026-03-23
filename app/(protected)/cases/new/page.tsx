import { createServiceClient } from "@/lib/supabase/server";
import { NewCaseWizard } from "./new-case-wizard";
import { FilePlus2 } from "lucide-react";

export default async function NewCasePage() {
  const supabase = createServiceClient();

  const [clientsRes, usersRes, busUnitsRes] = await Promise.all([
    supabase.from("client_accounts").select("id, name").eq("is_active", true).order("name"),
    supabase.from("users").select("id, full_name, role").eq("is_active", true).order("full_name"),
    supabase.from("business_units").select("id, name").eq("is_active", true).order("name"),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
          <FilePlus2 className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">New Case</h1>
          <p className="text-sm text-slate-500">Create a new customs entry case</p>
        </div>
      </div>

      <NewCaseWizard
        clients={clientsRes.data ?? []}
        users={usersRes.data ?? []}
        businessUnits={busUnitsRes.data ?? []}
      />
    </div>
  );
}
