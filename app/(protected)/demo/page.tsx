import { getCurrentUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DemoFlow } from "./demo-flow";

export default async function DemoPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Live Demo — Full Case Lifecycle</h1>
        <p className="text-sm text-slate-500 mt-1">
          Walk through the complete customs brokerage flow from client email to clearance, with AI agents at every step
        </p>
      </div>
      <DemoFlow tenantId={user.tenant_id} userId={user.id} />
    </div>
  );
}
