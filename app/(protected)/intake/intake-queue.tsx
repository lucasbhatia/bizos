"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mail, Bot, Check, X, AlertTriangle, Loader2, Send } from "lucide-react";
import { useRouter } from "next/navigation";

interface IntakeResult {
  draft_case: {
    client_id: string | null;
    client_name: string | null;
    mode: string | null;
    priority: string;
    eta: string | null;
    notes: string;
    metadata: Record<string, unknown>;
  };
  extracted_fields: { field: string; value: string; confidence: number; evidence: string }[];
  missing_fields: { field: string; why_needed: string; suggested_question: string }[];
  duplicate_candidates: { case_id: string; case_number: string; similarity_reason: string }[];
  suggested_tasks: { title: string; assignee_role: string; due_hours: number; priority: string }[];
  client_response_draft: { subject: string; body: string } | null;
  risk_flags: string[];
  client_match: { matched: boolean; client_name?: string; match_confidence?: number };
}

function confidenceColor(c: number) {
  if (c >= 0.85) return "bg-green-100 text-green-800";
  if (c >= 0.7) return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-800";
}

export function IntakeQueue({ tenantId }: { tenantId: string }) {
  const [intakeResults, setIntakeResults] = useState<{ id: number; email: { from: string; subject: string; body: string }; result: IntakeResult; confidence: number }[]>([]);
  const [testOpen, setTestOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailForm, setEmailForm] = useState({ from: "", subject: "", body: "" });
  const router = useRouter();

  async function handleTestIntake() {
    setLoading(true);
    try {
      const res = await fetch("/api/agents/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emailForm),
      });
      const data = await res.json();
      if (data.success) {
        setIntakeResults((prev) => [
          ...prev,
          {
            id: Date.now(),
            email: { ...emailForm },
            result: data.result as IntakeResult,
            confidence: data.confidence,
          },
        ]);
        setTestOpen(false);
        setEmailForm({ from: "", subject: "", body: "" });
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(item: typeof intakeResults[0]) {
    if (!item.result.draft_case.client_id || !item.result.draft_case.mode) {
      alert("Cannot confirm: missing client or transport mode");
      return;
    }

    const res = await fetch("/api/agents/intake/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        draft_case: {
          client_id: item.result.draft_case.client_id,
          mode: item.result.draft_case.mode,
          priority: item.result.draft_case.priority,
          eta: item.result.draft_case.eta,
          notes: item.result.draft_case.notes,
          metadata: item.result.draft_case.metadata,
        },
      }),
    });

    const data = await res.json();
    if (data.success) {
      setIntakeResults((prev) => prev.filter((r) => r.id !== item.id));
      router.push(`/cases/${data.case.id}`);
    }
  }

  function handleReject(itemId: number) {
    setIntakeResults((prev) => prev.filter((r) => r.id !== itemId));
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={testOpen} onOpenChange={setTestOpen}>
          <DialogTrigger asChild>
            <Button>
              <Mail className="mr-2 h-4 w-4" />
              Test Intake
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Simulate Email Intake</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>From</Label>
                <Input
                  placeholder="john@techglobal.com"
                  value={emailForm.from}
                  onChange={(e) => setEmailForm((f) => ({ ...f, from: e.target.value }))}
                />
              </div>
              <div>
                <Label>Subject</Label>
                <Input
                  placeholder="New shipment arriving LAX"
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm((f) => ({ ...f, subject: e.target.value }))}
                />
              </div>
              <div>
                <Label>Body</Label>
                <textarea
                  className="w-full rounded-md border p-2 text-sm min-h-[120px]"
                  placeholder="Hi, we have a container of laptops arriving at LAX via ocean freight. BL# MAEU123456789. ETA April 5th. Please process customs clearance."
                  value={emailForm.body}
                  onChange={(e) => setEmailForm((f) => ({ ...f, body: e.target.value }))}
                />
              </div>
              <Button className="w-full" onClick={handleTestIntake} disabled={loading || !emailForm.from || !emailForm.subject || !emailForm.body}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Process Email
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {intakeResults.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            <Mail className="h-8 w-8 mx-auto mb-2 text-slate-300" />
            <p>No pending intake items.</p>
            <p className="text-xs mt-1">Use &ldquo;Test Intake&rdquo; to simulate an email.</p>
          </CardContent>
        </Card>
      )}

      {intakeResults.map((item) => (
        <Card key={item.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-blue-600" />
                <CardTitle className="text-sm">AI Draft Case</CardTitle>
                <Badge className={confidenceColor(item.confidence)}>
                  {(item.confidence * 100).toFixed(0)}% confidence
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="default" onClick={() => handleConfirm(item)}>
                  <Check className="mr-1 h-3 w-3" />Confirm &amp; Create
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleReject(item.id)}>
                  <X className="mr-1 h-3 w-3" />Reject
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Email preview */}
            <div className="bg-slate-50 rounded p-3 text-sm">
              <p className="text-xs text-slate-400 mb-1">From: {item.email.from}</p>
              <p className="font-medium">{item.email.subject}</p>
              <p className="text-slate-600 mt-1 line-clamp-3">{item.email.body}</p>
            </div>

            {/* Draft details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-xs text-slate-400">Client</p>
                <p className="font-medium">{item.result.draft_case.client_name ?? "Unknown"}</p>
                {item.result.client_match.match_confidence != null && (
                  <Badge className={`text-xs ${confidenceColor(item.result.client_match.match_confidence)}`}>
                    {(item.result.client_match.match_confidence * 100).toFixed(0)}% match
                  </Badge>
                )}
              </div>
              <div>
                <p className="text-xs text-slate-400">Mode</p>
                <p className="font-medium capitalize">{item.result.draft_case.mode ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Priority</p>
                <Badge variant="outline" className="capitalize">{item.result.draft_case.priority}</Badge>
              </div>
              <div>
                <p className="text-xs text-slate-400">ETA</p>
                <p className="font-medium">{item.result.draft_case.eta ?? "—"}</p>
              </div>
            </div>

            {/* Risk flags */}
            {item.result.risk_flags.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {item.result.risk_flags.map((flag, i) => (
                  <Badge key={i} variant="destructive" className="text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />{flag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Missing fields */}
            {item.result.missing_fields.length > 0 && (
              <div className="bg-yellow-50 rounded p-2">
                <p className="text-xs font-medium text-yellow-700 mb-1">Missing Information</p>
                {item.result.missing_fields.map((mf, i) => (
                  <p key={i} className="text-xs text-yellow-600">
                    {mf.field}: {mf.why_needed}
                  </p>
                ))}
              </div>
            )}

            {/* Duplicate candidates */}
            {item.result.duplicate_candidates.length > 0 && (
              <div className="bg-orange-50 rounded p-2">
                <p className="text-xs font-medium text-orange-700 mb-1">Possible Duplicates</p>
                {item.result.duplicate_candidates.map((dup, i) => (
                  <p key={i} className="text-xs text-orange-600">
                    {dup.case_number}: {dup.similarity_reason}
                  </p>
                ))}
              </div>
            )}

            {/* Client response draft */}
            {item.result.client_response_draft && (
              <details className="text-sm">
                <summary className="cursor-pointer text-xs text-slate-400 hover:text-slate-600">
                  View draft client response
                </summary>
                <div className="mt-2 bg-blue-50 rounded p-3">
                  <p className="font-medium text-xs">{item.result.client_response_draft.subject}</p>
                  <p className="text-xs mt-1 whitespace-pre-wrap">{item.result.client_response_draft.body}</p>
                </div>
              </details>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
