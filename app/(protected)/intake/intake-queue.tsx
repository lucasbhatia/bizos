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
import { Mail, Bot, Check, X, AlertTriangle, Loader2, Send, Inbox, Sparkles, Clock, User } from "lucide-react";
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
  if (c >= 0.85) return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (c >= 0.7) return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-red-100 text-red-800 border-red-200";
}

function confidenceLabel(c: number) {
  if (c >= 0.85) return "High";
  if (c >= 0.7) return "Medium";
  return "Low";
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
      {/* Test Intake Button */}
      <div className="flex justify-end">
        <Dialog open={testOpen} onOpenChange={setTestOpen}>
          <DialogTrigger asChild>
            <Button className="bg-violet-600 hover:bg-violet-700 shadow-sm">
              <Mail className="mr-2 h-4 w-4" />
              Test Intake
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
                  <Mail className="h-4 w-4 text-violet-600" />
                </div>
                Simulate Email Intake
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">From</Label>
                <Input
                  placeholder="john@techglobal.com"
                  value={emailForm.from}
                  onChange={(e) => setEmailForm((f) => ({ ...f, from: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Subject</Label>
                <Input
                  placeholder="New shipment arriving LAX"
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm((f) => ({ ...f, subject: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Body</Label>
                <textarea
                  className="w-full rounded-md border border-slate-200 bg-white p-3 text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-shadow"
                  placeholder="Hi, we have a container of laptops arriving at LAX via ocean freight. BL# MAEU123456789. ETA April 5th. Please process customs clearance."
                  value={emailForm.body}
                  onChange={(e) => setEmailForm((f) => ({ ...f, body: e.target.value }))}
                />
              </div>
              <Button
                className="w-full bg-violet-600 hover:bg-violet-700"
                onClick={handleTestIntake}
                disabled={loading || !emailForm.from || !emailForm.subject || !emailForm.body}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Process Email
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Empty State */}
      {intakeResults.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <Inbox className="h-7 w-7 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-600">No pending intake items</p>
            <p className="text-xs text-slate-400 mt-1.5">
              Use the &ldquo;Test Intake&rdquo; button above to simulate an incoming email
            </p>
          </CardContent>
        </Card>
      )}

      {/* Intake Result Cards */}
      {intakeResults.map((item) => (
        <Card key={item.id} className="shadow-sm border-slate-200 overflow-hidden">
          {/* Colored top accent */}
          <div className="h-1 bg-gradient-to-r from-violet-500 to-blue-500" />
          <CardHeader className="pb-3 pt-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
                  <Sparkles className="h-4 w-4 text-violet-600" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold text-slate-900">AI Draft Case</CardTitle>
                  <p className="text-xs text-slate-400 mt-0.5">Processed just now</p>
                </div>
                <Badge className={`ml-1 text-xs font-medium border ${confidenceColor(item.confidence)}`}>
                  {(item.confidence * 100).toFixed(0)}% {confidenceLabel(item.confidence)}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                  onClick={() => handleConfirm(item)}
                >
                  <Check className="mr-1.5 h-3.5 w-3.5" />
                  Confirm &amp; Create
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleReject(item.id)} className="text-slate-600">
                  <X className="mr-1.5 h-3.5 w-3.5" />
                  Reject
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pb-5">
            {/* Email preview */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-xs font-medium text-slate-500">Email Preview</span>
              </div>
              <p className="text-xs text-slate-400">From: {item.email.from}</p>
              <p className="font-medium text-sm text-slate-800 mt-1">{item.email.subject}</p>
              <p className="text-sm text-slate-600 mt-1.5 line-clamp-3 leading-relaxed">{item.email.body}</p>
            </div>

            {/* Draft details grid */}
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Extracted Details</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <User className="h-3 w-3 text-slate-400" />
                    <p className="text-xs font-medium text-slate-400">Client</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-800">{item.result.draft_case.client_name ?? "Unknown"}</p>
                  {item.result.client_match.match_confidence != null && (
                    <Badge className={`text-[10px] border ${confidenceColor(item.result.client_match.match_confidence)}`}>
                      {(item.result.client_match.match_confidence * 100).toFixed(0)}% match
                    </Badge>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-400">Transport Mode</p>
                  <p className="text-sm font-semibold text-slate-800 capitalize">{item.result.draft_case.mode ?? "---"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-400">Priority</p>
                  <Badge variant="outline" className="capitalize text-xs">{item.result.draft_case.priority}</Badge>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-slate-400" />
                    <p className="text-xs font-medium text-slate-400">ETA</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-800">{item.result.draft_case.eta ?? "---"}</p>
                </div>
              </div>
            </div>

            {/* Risk flags */}
            {item.result.risk_flags.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                  <p className="text-xs font-semibold text-red-700">Risk Flags</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {item.result.risk_flags.map((flag, i) => (
                    <Badge key={i} variant="destructive" className="text-xs font-medium">
                      {flag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Missing fields */}
            {item.result.missing_fields.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                  <p className="text-xs font-semibold text-amber-700">Missing Information</p>
                </div>
                <div className="space-y-1.5">
                  {item.result.missing_fields.map((mf, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-amber-700">
                      <span className="font-semibold whitespace-nowrap">{mf.field}:</span>
                      <span>{mf.why_needed}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Duplicate candidates */}
            {item.result.duplicate_candidates.length > 0 && (
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                <p className="text-xs font-semibold text-orange-700 mb-2">Possible Duplicates</p>
                <div className="space-y-1">
                  {item.result.duplicate_candidates.map((dup, i) => (
                    <p key={i} className="text-xs text-orange-700">
                      <span className="font-mono font-semibold">{dup.case_number}</span>
                      <span className="mx-1.5 text-orange-400">--</span>
                      {dup.similarity_reason}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Client response draft */}
            {item.result.client_response_draft && (
              <details className="group rounded-lg border border-slate-200 overflow-hidden">
                <summary className="cursor-pointer px-4 py-2.5 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2">
                  <Mail className="h-3 w-3" />
                  View draft client response
                  <span className="ml-auto text-slate-300 group-open:rotate-90 transition-transform">&#9654;</span>
                </summary>
                <div className="border-t border-slate-200 bg-blue-50 p-4">
                  <p className="font-medium text-xs text-blue-800">{item.result.client_response_draft.subject}</p>
                  <p className="text-xs mt-2 whitespace-pre-wrap text-blue-700 leading-relaxed">{item.result.client_response_draft.body}</p>
                </div>
              </details>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
