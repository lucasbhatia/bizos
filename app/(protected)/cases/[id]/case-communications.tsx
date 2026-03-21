"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bot, Mail, Loader2, Send, Trash2, DollarSign } from "lucide-react";

interface CommDraft {
  event_type: string;
  subject: string;
  body: string;
  contact_name: string;
  contact_email: string;
  generated_at: string;
  status: string;
}

interface InvoiceDraft {
  invoice_lines: { description: string; category: string; quantity: number; unit_price: number; total: number }[];
  subtotal: number;
  total: number;
  currency: string;
  generated_at: string;
}

const EVENT_LABELS: Record<string, string> = {
  missing_documents: "Missing Documents Request",
  status_update: "Status Update",
  hold_notification: "Hold Notification",
  clearance_notification: "Clearance Notification",
};

export function CaseCommunications({
  caseId,
  commDrafts,
  invoiceDraft,
}: {
  caseId: string;
  commDrafts: CommDraft[];
  invoiceDraft: InvoiceDraft | null;
}) {
  const [drafts, setDrafts] = useState(commDrafts);
  const [loading, setLoading] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("missing_documents");
  const [invoice, setInvoice] = useState(invoiceDraft);

  async function generateDraft() {
    setLoading(true);
    try {
      const res = await fetch("/api/agents/comms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, eventType: selectedType }),
      });
      const data = await res.json();
      if (data.success) {
        const newDraft: CommDraft = {
          event_type: selectedType,
          subject: data.result.subject,
          body: data.result.body,
          contact_name: data.result.contact_name,
          contact_email: data.result.contact_email,
          generated_at: new Date().toISOString(),
          status: "draft",
        };
        setDrafts((prev) => [newDraft, ...prev]);
      }
    } finally {
      setLoading(false);
    }
  }

  async function generateInvoice() {
    setInvoiceLoading(true);
    try {
      const res = await fetch("/api/agents/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId }),
      });
      const data = await res.json();
      if (data.success) {
        setInvoice(data.result as InvoiceDraft);
      }
    } finally {
      setInvoiceLoading(false);
    }
  }

  function discardDraft(index: number) {
    setDrafts((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-6">
      {/* Generate new comm */}
      <div className="flex items-center gap-3">
        <Bot className="h-5 w-5 text-blue-600" />
        <h3 className="text-sm font-medium">AI Communications</h3>
        <div className="flex-1" />
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-48 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="missing_documents">Missing Documents</SelectItem>
            <SelectItem value="status_update">Status Update</SelectItem>
            <SelectItem value="hold_notification">Hold Notification</SelectItem>
            <SelectItem value="clearance_notification">Clearance</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" onClick={generateDraft} disabled={loading}>
          {loading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Mail className="h-3 w-3 mr-1" />}
          Draft Email
        </Button>
        <Button size="sm" variant="outline" onClick={generateInvoice} disabled={invoiceLoading}>
          {invoiceLoading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <DollarSign className="h-3 w-3 mr-1" />}
          Generate Invoice
        </Button>
      </div>

      {/* Invoice draft */}
      {invoice && (
        <Card className="border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              Invoice Draft
              <Badge variant="outline" className="text-xs">AI Generated</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-slate-500">
                  <th className="pb-2">Description</th>
                  <th className="pb-2 text-right">Qty</th>
                  <th className="pb-2 text-right">Unit Price</th>
                  <th className="pb-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.invoice_lines.map((line, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-2">{line.description}</td>
                    <td className="py-2 text-right">{line.quantity}</td>
                    <td className="py-2 text-right">${line.unit_price.toFixed(2)}</td>
                    <td className="py-2 text-right">${line.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-medium">
                  <td colSpan={3} className="pt-2 text-right">Total ({invoice.currency})</td>
                  <td className="pt-2 text-right">${invoice.total.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Email drafts */}
      {drafts.length === 0 && !invoice && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-slate-500">
            No communication drafts yet. Use the buttons above to generate emails or invoices.
          </CardContent>
        </Card>
      )}

      {drafts.map((draft, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-600" />
                <CardTitle className="text-sm">{EVENT_LABELS[draft.event_type] ?? draft.event_type}</CardTitle>
                <Badge variant="outline" className="text-xs">{draft.status}</Badge>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="default" className="h-7 text-xs" disabled>
                  <Send className="h-3 w-3 mr-1" />Edit &amp; Send
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => discardDraft(i)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-slate-400 mb-1">
              To: {draft.contact_name} {draft.contact_email ? `<${draft.contact_email}>` : ""}
            </div>
            <div className="text-sm font-medium mb-2">Subject: {draft.subject}</div>
            <div className="bg-slate-50 rounded p-3 text-sm whitespace-pre-wrap">{draft.body}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
