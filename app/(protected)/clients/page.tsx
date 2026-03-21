import { getCurrentUser, createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, Phone, Mail } from "lucide-react";

export default async function ClientsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!["admin", "ops_manager", "broker_lead"].includes(user.role)) {
    redirect("/dashboard");
  }

  const supabase = createServiceClient();

  const { data: clients } = await supabase
    .from("client_accounts")
    .select("*")
    .eq("tenant_id", user.tenant_id)
    .order("name");

  const { data: contacts } = await supabase
    .from("contacts")
    .select("*")
    .eq("tenant_id", user.tenant_id);

  const { data: caseCounts } = await supabase
    .from("entry_cases")
    .select("client_account_id")
    .eq("tenant_id", user.tenant_id)
    .not("status", "in", '("closed","archived")');

  // Count cases per client
  const caseCountMap = new Map<string, number>();
  for (const c of caseCounts ?? []) {
    caseCountMap.set(c.client_account_id, (caseCountMap.get(c.client_account_id) ?? 0) + 1);
  }

  // Group contacts by client
  const contactMap = new Map<string, typeof contacts>();
  for (const contact of contacts ?? []) {
    const list = contactMap.get(contact.client_account_id) ?? [];
    list.push(contact);
    contactMap.set(contact.client_account_id, list);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Clients</h1>
        <p className="text-sm text-slate-500">{(clients ?? []).length} client accounts</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(clients ?? []).map((client) => {
          const clientContacts = contactMap.get(client.id) ?? [];
          const activeCases = caseCountMap.get(client.id) ?? 0;
          const primaryContact = clientContacts.find((c) => c.is_primary) ?? clientContacts[0];

          return (
            <Card key={client.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{client.name}</CardTitle>
                  <Badge variant={client.is_active ? "default" : "secondary"}>
                    {client.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {client.importer_of_record_number && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Building2 className="h-4 w-4 text-slate-400" />
                    IOR: {client.importer_of_record_number}
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-slate-400" />
                  <span className="text-blue-600 font-medium">{activeCases} active cases</span>
                </div>

                {primaryContact && (
                  <div className="border-t pt-2 space-y-1">
                    <p className="text-xs text-slate-400 uppercase font-medium">Primary Contact</p>
                    <p className="text-sm font-medium">{primaryContact.name}</p>
                    {primaryContact.email && (
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Mail className="h-3 w-3" />
                        {primaryContact.email}
                      </div>
                    )}
                    {primaryContact.phone && (
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Phone className="h-3 w-3" />
                        {primaryContact.phone}
                      </div>
                    )}
                  </div>
                )}

                {client.sop_notes && (
                  <div className="border-t pt-2">
                    <p className="text-xs text-slate-400 uppercase font-medium">SOP Notes</p>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">{client.sop_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {(clients ?? []).length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-slate-400">
            <Users className="h-8 w-8 mx-auto mb-2" />
            No clients yet
          </CardContent>
        </Card>
      )}
    </div>
  );
}
