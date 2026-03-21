import { getCurrentUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { IntakeQueue } from "./intake-queue";
import { Badge } from "@/components/ui/badge";
import { Bot } from "lucide-react";

export default async function IntakePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Only admin, broker_lead, ops_manager, specialist can access
  if (!["admin", "broker_lead", "ops_manager", "specialist"].includes(user.role)) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
          <Bot className="h-5 w-5 text-violet-600" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Intake Queue</h1>
            <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-100 text-xs font-medium">
              AI-Powered
            </Badge>
          </div>
          <p className="text-sm text-slate-500">
            Emails processed by AI, awaiting human review to create cases
          </p>
        </div>
      </div>
      <IntakeQueue tenantId={user.tenant_id} />
    </div>
  );
}
