import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/supabase/portal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

export default async function PortalMessagesPage() {
  const portalUser = await getPortalUser();
  if (!portalUser) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Messages</h1>
        <p className="text-sm text-slate-500">
          Communicate with your customs broker team
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inbox</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-medium text-slate-500">
              No messages yet
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Messaging will be available in a future update.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
