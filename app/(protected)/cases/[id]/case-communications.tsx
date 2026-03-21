"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bot, Mail, Loader2, Send, Trash2, DollarSign, CheckCircle2 } from "lucide-react";

interface CommDraft {
  event_type: string;
  subject: string;
  body: string;
  contact_name: string;
  contact_email: string;
  generated_at: string;
  status: string;
  sent_at?: string;
  gmail_message_id?: string;
}

interface SentEmail {
  to: string;
  subject: string;
  body: string;
  event_type: string;
  sent_at: string;
  sent_by: string;
  gmail_message_id?: string;
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

interface SendDialogState {
  open: boolean;
  draftIndex: number;
  to: string;
  subject: string;
  body: string;
  eventType: string;
}

export function CaseCommunications({
  caseId,
  commDrafts,
  invoiceDraft,
  sentEmails: initialSentEmails,
}: {
  caseId: string;
  commDrafts: CommDraft[];
  invoiceDraft: InvoiceDraft | null;
  sentEmails?: SentEmail[];
}) {
  const [drafts, setDrafts] = useState(commDrafts);
  const [sentEmails, setSentEmails] = useState<SentEmail[]>(initialSentEmails ?? []);
  const [loading, setLoading] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("missing_documents");
  const [invoice, setInvoice] = useState(invoiceDraft);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const [sendDialog, setSendDialog] = useState<SendDialogState>({
    open: false,
    draftIndex: -1,
    to: "",
    subject: "",
    body: "",
    eventType: "",
  });

  async function generateDraft() {
    setLoading(true);
    try {
      const res = await fetch("/api/agents/comms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, eventType: selectedType }),
      });
      const data = await res.json() as {
        success: boolean;
        result: {
          subject: string;
          body: string;
          contact_name: string;
          contact_email: string;
        };
      };
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
      const data = await res.json() as { success: boolean; result: InvoiceDraft };
      if (data.success) {
        setInvoice(data.result);
      }
    } finally {
      setInvoiceLoading(false);
    }
  }

  function discardDraft(index: number) {
    setDrafts((prev) => prev.filter((_, i) => i !== index));
  }

  function openSendDialog(draft: CommDraft, index: number) {
    setSendError(null);
    setSendDialog({
      open: true,
      draftIndex: index,
      to: draft.contact_email,
      subject: draft.subject,
      body: draft.body,
      eventType: draft.event_type,
    });
  }

  async function handleSend() {
    setSending(true);
    setSendError(null);

    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId,
          to: sendDialog.to,
          subject: sendDialog.subject,
          body: sendDialog.body,
          eventType: sendDialog.eventType,
          draftIndex: sendDialog.draftIndex,
        }),
      });

      const data = await res.json() as {
        success?: boolean;
        error?: string;
        messageId?: string;
      };

      if (!res.ok || !data.success) {
        setSendError(data.error ?? "Failed to send email");
        return;
      }

      // Update draft status locally
      setDrafts((prev) =>
        prev.map((d, i) =>
          i === sendDialog.draftIndex
            ? {
                ...d,
                status: "sent",
                sent_at: new Date().toISOString(),
                gmail_message_id: data.messageId,
              }
            : d
        )
      );

      // Add to sent emails list
      setSentEmails((prev) => [
        {
          to: sendDialog.to,
          subject: sendDialog.subject,
          body: sendDialog.body,
          event_type: sendDialog.eventType,
          sent_at: new Date().toISOString(),
          sent_by: "",
          gmail_message_id: data.messageId,
        },
        ...prev,
      ]);

      setSendDialog((prev) => ({ ...prev, open: false }));
    } catch {
      setSendError("Network error. Please try again.");
    } finally {
      setSending(false);
    }
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
      {drafts.length === 0 && !invoice && sentEmails.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-slate-500">
            No communication drafts yet. Use the buttons above to generate emails or invoices.
          </CardContent>
        </Card>
      )}

      {drafts.map((draft, i) => (
        <Card key={i} className={draft.status === "sent" ? "border-green-200" : undefined}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-600" />
                <CardTitle className="text-sm">{EVENT_LABELS[draft.event_type] ?? draft.event_type}</CardTitle>
                <Badge
                  variant={draft.status === "sent" ? "default" : "outline"}
                  className="text-xs"
                >
                  {draft.status === "sent" ? "Sent" : "Draft"}
                </Badge>
              </div>
              <div className="flex gap-2">
                {draft.status !== "sent" && (
                  <>
                    <Button
                      size="sm"
                      variant="default"
                      className="h-7 text-xs"
                      onClick={() => openSendDialog(draft, i)}
                    >
                      <Send className="h-3 w-3 mr-1" />Edit &amp; Send
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => discardDraft(i)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </>
                )}
                {draft.status === "sent" && draft.sent_at && (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                    Sent {new Date(draft.sent_at).toLocaleString()}
                  </span>
                )}
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

      {/* Sent Messages Section */}
      {sentEmails.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <h3 className="text-sm font-medium">Sent Messages</h3>
            <Badge variant="outline" className="text-xs">{sentEmails.length}</Badge>
          </div>

          {sentEmails.map((email, i) => (
            <Card key={i} className="border-green-200">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Send className="h-4 w-4 text-green-600" />
                    <CardTitle className="text-sm">
                      {EVENT_LABELS[email.event_type] ?? email.event_type}
                    </CardTitle>
                    <Badge variant="default" className="text-xs">Sent</Badge>
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Date(email.sent_at).toLocaleString()}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-slate-400 mb-1">To: {email.to}</div>
                <div className="text-sm font-medium mb-2">Subject: {email.subject}</div>
                <div className="bg-slate-50 rounded p-3 text-sm whitespace-pre-wrap">{email.body}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Send Email Dialog */}
      <Dialog
        open={sendDialog.open}
        onOpenChange={(open) => setSendDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit &amp; Send Email</DialogTitle>
            <DialogDescription>
              Review and edit the email before sending via Gmail.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="send-to">To</Label>
              <Input
                id="send-to"
                type="email"
                value={sendDialog.to}
                onChange={(e) =>
                  setSendDialog((prev) => ({ ...prev, to: e.target.value }))
                }
                placeholder="recipient@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="send-subject">Subject</Label>
              <Input
                id="send-subject"
                value={sendDialog.subject}
                onChange={(e) =>
                  setSendDialog((prev) => ({ ...prev, subject: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="send-body">Body</Label>
              <Textarea
                id="send-body"
                value={sendDialog.body}
                onChange={(e) =>
                  setSendDialog((prev) => ({ ...prev, body: e.target.value }))
                }
                rows={10}
                className="font-mono text-sm"
              />
            </div>

            {sendError && (
              <div className="rounded bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {sendError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSendDialog((prev) => ({ ...prev, open: false }))}
              disabled={sending}
            >
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={sending || !sendDialog.to || !sendDialog.subject}>
              {sending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
