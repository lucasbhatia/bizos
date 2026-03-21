import { createServiceClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { NewInvoiceForm } from "./new-invoice-form";

export default async function NewInvoicePage() {
  const supabase = createServiceClient();

  const [clientsRes, casesRes] = await Promise.all([
    supabase
      .from("client_accounts")
      .select("id, name")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("entry_cases")
      .select("id, case_number, client_account_id")
      .in("status", ["billing", "released", "closed"])
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Create Invoice</h1>
          <p className="text-sm text-slate-500">
            Create a new invoice for a client
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/finance">Cancel</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
        </CardHeader>
        <CardContent>
          <NewInvoiceForm
            clients={clientsRes.data ?? []}
            cases={casesRes.data ?? []}
          />
        </CardContent>
      </Card>
    </div>
  );
}
