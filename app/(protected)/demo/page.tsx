import { getCurrentUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DemoFlow } from "./demo-flow";
import { Play } from "lucide-react";

export default async function DemoPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
          <Play className="h-5 w-5 text-violet-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Live Demo &mdash; Full Case Lifecycle</h1>
          <p className="text-sm text-slate-500">
            Walk through the complete customs brokerage flow from client email to clearance, with AI agents at every step
          </p>
        </div>
      </div>
      <DemoFlow tenantId={user.tenant_id} userId={user.id} />
    </div>
  );
}
