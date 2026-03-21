import { getCurrentUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { IntakeQueue } from "./intake-queue";

export default async function IntakePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Only admin, broker_lead, ops_manager, specialist can access
  if (!["admin", "broker_lead", "ops_manager", "specialist"].includes(user.role)) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Intake Queue</h1>
        <p className="text-sm text-slate-500">
          AI-processed emails awaiting confirmation to create cases
        </p>
      </div>
      <IntakeQueue tenantId={user.tenant_id} />
    </div>
  );
}
