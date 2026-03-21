"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Mail, Bot, FileText, Search, ShieldCheck, TrendingUp,
  DollarSign, Send, CheckCircle2, Loader2, ChevronRight,
  ArrowRight, Package, AlertTriangle, Clock, Sparkles,
} from "lucide-react";

interface StepResult {
  success: boolean;
  data: Record<string, unknown>;
  duration?: number;
}

interface Step {
  id: string;
  number: number;
  title: string;
  description: string;
  agent: string;
  icon: React.ElementType;
  color: string;
  iconBg: string;
}

const DEMO_STEPS: Step[] = [
  {
    id: "intake",
    number: 1,
    title: "Email Received → AI Intake",
    description: "Client emails about a new shipment. The Intake Agent extracts details, matches the client, and creates a draft case.",
    agent: "intake-agent",
    icon: Mail,
    color: "text-violet-600",
    iconBg: "bg-violet-100",
  },
  {
    id: "create_case",
    number: 2,
    title: "Confirm & Create Case",
    description: "Human reviews the AI draft and confirms. Case is created with auto-generated number, initial tasks, and workflow event.",
    agent: "human",
    icon: CheckCircle2,
    color: "text-emerald-600",
    iconBg: "bg-emerald-100",
  },
  {
    id: "ops_check",
    number: 3,
    title: "Ops Coordinator Sweep",
    description: "The Ops Coordinator agent scans all cases for SLA violations, stuck cases, and overdue tasks. Creates escalation tasks automatically.",
    agent: "ops-coordinator",
    icon: TrendingUp,
    color: "text-blue-600",
    iconBg: "bg-blue-100",
  },
  {
    id: "classify",
    number: 4,
    title: "AI Classification Support",
    description: "Agent suggests HTS codes for the product with confidence scores, rationale, and 'why it might be wrong' for each candidate.",
    agent: "classification-support",
    icon: Search,
    color: "text-amber-600",
    iconBg: "bg-amber-100",
  },
  {
    id: "comms_missing",
    number: 5,
    title: "Client Comms — Missing Docs",
    description: "Agent drafts a professional email to the client requesting missing documents, referencing the case and specific doc types needed.",
    agent: "client-comms",
    icon: Send,
    color: "text-sky-600",
    iconBg: "bg-sky-100",
  },
  {
    id: "finance",
    number: 6,
    title: "Finance Agent — Invoice Draft",
    description: "When the case reaches billing, the Finance Agent generates an invoice draft with line items based on case attributes and client billing terms.",
    agent: "finance-agent",
    icon: DollarSign,
    color: "text-emerald-600",
    iconBg: "bg-emerald-100",
  },
  {
    id: "comms_cleared",
    number: 7,
    title: "Client Comms — Clearance Notice",
    description: "Agent drafts a congratulatory email notifying the client their shipment has been cleared by customs.",
    agent: "client-comms",
    icon: Package,
    color: "text-green-600",
    iconBg: "bg-green-100",
  },
];

const SAMPLE_EMAIL = {
  from: "sarah.miller@techglobal.com",
  subject: "New shipment — 2 containers of laptops arriving LAX",
  body: `Hi team,

We have two 40ft containers of laptop computers arriving at the Port of Los Angeles via ocean freight.

Details:
- Vessel: MSC GLORIA, Voyage 2026W
- BL#: MEDU1234567
- ETA: April 15, 2026
- Commodity: Laptop computers (Dell Latitude 5540)
- Total value: $2,400,000 USD
- Country of origin: China
- 2 x 40ft containers, approximately 4,800 units

Please process customs clearance. We need these units for our Q2 distribution.

Thanks,
Sarah Miller
TechGlobal Inc
Import Operations Manager`,
};

export function DemoFlow({ tenantId, userId }: { tenantId: string; userId: string }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [results, setResults] = useState<Record<string, StepResult>>({});
  const [running, setRunning] = useState(false);
  const [caseId, setCaseId] = useState<string | null>(null);

  async function runStep(step: Step) {
    setRunning(true);
    const start = Date.now();

    try {
      let result: StepResult;

      switch (step.id) {
        case "intake": {
          const res = await fetch("/api/agents/intake", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(SAMPLE_EMAIL),
          });
          const data = await res.json();
          result = { success: data.success, data, duration: Date.now() - start };
          break;
        }

        case "create_case": {
          const intakeResult = results.intake;
          const draftCase = intakeResult?.data?.result as Record<string, unknown> | undefined;
          const draft = draftCase?.draft_case as Record<string, unknown> | undefined;

          const res = await fetch("/api/agents/intake/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              draft_case: {
                client_id: draft?.client_id,
                mode: draft?.mode ?? "ocean",
                priority: draft?.priority ?? "high",
                eta: draft?.eta ?? new Date(Date.now() + 25 * 86400000).toISOString().split("T")[0],
                notes: "Demo case — laptop shipment from TechGlobal",
                metadata: draft?.metadata ?? {},
              },
            }),
          });
          const data = await res.json();
          if (data.success && data.case?.id) {
            setCaseId(data.case.id);
          }
          result = { success: data.success, data, duration: Date.now() - start };
          break;
        }

        case "ops_check": {
          const res = await fetch("/api/agents/ops-coordinator/run", { method: "POST" });
          const data = await res.json();
          result = { success: data.success, data, duration: Date.now() - start };
          break;
        }

        case "classify": {
          const res = await fetch("/api/agents/classify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              productDescription: "Laptop computers, Dell Latitude 5540, 15.6 inch display, Intel Core i5 processor, 16GB RAM, portable automatic data processing machines",
              countryOfOrigin: "China",
              caseId: caseId ?? undefined,
            }),
          });
          const data = await res.json();
          result = { success: data.success, data, duration: Date.now() - start };
          break;
        }

        case "comms_missing": {
          const targetCaseId = caseId ?? (results.create_case?.data as Record<string, unknown>)?.case as string | undefined;
          if (!targetCaseId) {
            result = { success: false, data: { error: "No case created yet" }, duration: 0 };
            break;
          }
          const res = await fetch("/api/agents/comms", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              caseId: typeof targetCaseId === 'object' ? (targetCaseId as Record<string, string>).id : targetCaseId,
              eventType: "missing_documents",
            }),
          });
          const data = await res.json();
          result = { success: data.success, data, duration: Date.now() - start };
          break;
        }

        case "finance": {
          const targetCaseId = caseId ?? (results.create_case?.data as Record<string, unknown>)?.case as string | undefined;
          if (!targetCaseId) {
            result = { success: false, data: { error: "No case created yet" }, duration: 0 };
            break;
          }
          const res = await fetch("/api/agents/finance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              caseId: typeof targetCaseId === 'object' ? (targetCaseId as Record<string, string>).id : targetCaseId,
            }),
          });
          const data = await res.json();
          result = { success: data.success, data, duration: Date.now() - start };
          break;
        }

        case "comms_cleared": {
          const targetCaseId = caseId ?? (results.create_case?.data as Record<string, unknown>)?.case as string | undefined;
          if (!targetCaseId) {
            result = { success: false, data: { error: "No case created yet" }, duration: 0 };
            break;
          }
          const res = await fetch("/api/agents/comms", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              caseId: typeof targetCaseId === 'object' ? (targetCaseId as Record<string, string>).id : targetCaseId,
              eventType: "clearance_notification",
            }),
          });
          const data = await res.json();
          result = { success: data.success, data, duration: Date.now() - start };
          break;
        }

        default:
          result = { success: false, data: { error: "Unknown step" }, duration: 0 };
      }

      setResults((prev) => ({ ...prev, [step.id]: result }));
      if (result.success) {
        setCurrentStep((prev) => prev + 1);
      }
    } catch (err) {
      setResults((prev) => ({
        ...prev,
        [step.id]: { success: false, data: { error: String(err) }, duration: Date.now() - start },
      }));
    } finally {
      setRunning(false);
    }
  }

  function renderResult(stepId: string) {
    const result = results[stepId];
    if (!result) return null;

    const data = result.data;

    switch (stepId) {
      case "intake": {
        const r = data.result as Record<string, unknown> | undefined;
        const draft = r?.draft_case as Record<string, unknown> | undefined;
        const missing = r?.missing_fields as { field: string }[] | undefined;
        const clientMatch = r?.client_match as { client_name?: string; match_confidence?: number } | undefined;
        return (
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-slate-400">Client:</span> <span className="font-semibold">{clientMatch?.client_name ?? "Unknown"}</span>
                {clientMatch?.match_confidence != null && <Badge className="ml-1 text-[10px]">{(clientMatch.match_confidence * 100).toFixed(0)}%</Badge>}
              </div>
              <div><span className="text-slate-400">Mode:</span> <span className="font-semibold capitalize">{String(draft?.mode ?? "—")}</span></div>
              <div><span className="text-slate-400">Priority:</span> <span className="font-semibold capitalize">{String(draft?.priority ?? "—")}</span></div>
              <div><span className="text-slate-400">ETA:</span> <span className="font-semibold">{String(draft?.eta ?? "—")}</span></div>
            </div>
            {missing && missing.length > 0 && (
              <div className="rounded bg-amber-50 border border-amber-200 p-2 text-xs text-amber-700">
                <span className="font-semibold">Missing:</span> {missing.map((m) => m.field).join(", ")}
              </div>
            )}
          </div>
        );
      }

      case "create_case": {
        const c = data.case as Record<string, unknown> | undefined;
        return (
          <div className="text-sm">
            <span className="text-slate-400">Case created:</span>{" "}
            <span className="font-mono font-bold text-blue-600">{String(c?.case_number ?? "—")}</span>
            {c?.id ? <span className="text-xs text-slate-400 ml-2">(ID: {String(c.id).substring(0, 8)}...)</span> : null}
          </div>
        );
      }

      case "ops_check": {
        const r = data.result as Record<string, unknown> | undefined;
        const digest = r?.digest as Record<string, unknown> | undefined;
        return (
          <div className="text-sm space-y-1">
            <div><span className="text-slate-400">Stuck cases:</span> <span className="font-semibold">{String(digest?.stuck_cases ?? 0)}</span></div>
            <div><span className="text-slate-400">Overdue tasks:</span> <span className="font-semibold">{String(digest?.overdue_tasks ?? 0)}</span></div>
            <div><span className="text-slate-400">Tasks created:</span> <span className="font-semibold">{String(digest?.tasks_created ?? 0)}</span></div>
          </div>
        );
      }

      case "classify": {
        const r = data.result as Record<string, unknown> | undefined;
        const candidates = r?.candidates as { hts_code: string; description: string; confidence: number }[] | undefined;
        return (
          <div className="space-y-1.5">
            {candidates?.slice(0, 3).map((c, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="font-mono font-bold text-slate-700">{c.hts_code}</span>
                <span className="text-xs text-slate-500 truncate flex-1">{c.description}</span>
                <Badge className={c.confidence > 0.85 ? "bg-emerald-100 text-emerald-800" : c.confidence > 0.7 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"}>
                  {(c.confidence * 100).toFixed(0)}%
                </Badge>
              </div>
            ))}
          </div>
        );
      }

      case "comms_missing":
      case "comms_cleared": {
        const r = data.result as Record<string, unknown> | undefined;
        return (
          <div className="text-sm space-y-1">
            <div className="font-semibold">{String(r?.subject ?? "")}</div>
            <div className="text-xs text-slate-500 line-clamp-3 whitespace-pre-wrap">{String(r?.body ?? "").substring(0, 200)}...</div>
          </div>
        );
      }

      case "finance": {
        const r = data.result as Record<string, unknown> | undefined;
        const lines = r?.invoice_lines as { description: string; total: number }[] | undefined;
        return (
          <div className="text-sm space-y-1">
            {lines?.slice(0, 4).map((l, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-slate-600">{l.description}</span>
                <span className="font-mono font-semibold">${l.total?.toFixed(2)}</span>
              </div>
            ))}
            {r?.total != null && (
              <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                <span>Total</span>
                <span className="font-mono">${Number(r.total).toFixed(2)}</span>
              </div>
            )}
          </div>
        );
      }

      default:
        return <pre className="text-xs text-slate-500 overflow-auto max-h-40">{JSON.stringify(data, null, 2)}</pre>;
    }
  }

  return (
    <div className="space-y-4">
      {/* Email preview */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
              <Mail className="h-4 w-4 text-slate-500" />
            </div>
            <div>
              <CardTitle className="text-sm">Sample Inbound Email</CardTitle>
              <p className="text-xs text-slate-400">This email triggers the full flow</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-slate-50 border p-4 text-sm space-y-1">
            <p className="text-xs text-slate-400">From: {SAMPLE_EMAIL.from}</p>
            <p className="font-semibold">{SAMPLE_EMAIL.subject}</p>
            <p className="text-slate-600 text-xs whitespace-pre-wrap mt-2 leading-relaxed">{SAMPLE_EMAIL.body}</p>
          </div>
        </CardContent>
      </Card>

      {/* Steps */}
      {DEMO_STEPS.map((step, i) => {
        const isActive = i === currentStep;
        const isDone = results[step.id]?.success === true;
        const isFailed = results[step.id]?.success === false;
        const isPending = i > currentStep;
        const Icon = step.icon;
        const result = results[step.id];

        return (
          <Card
            key={step.id}
            className={`transition-all duration-300 ${
              isActive ? "border-blue-200 shadow-md ring-1 ring-blue-100" :
              isDone ? "border-emerald-200 bg-emerald-50/30" :
              isFailed ? "border-red-200 bg-red-50/30" :
              "border-slate-200 opacity-60"
            }`}
          >
            <CardContent className="py-4">
              <div className="flex items-start gap-4">
                {/* Step indicator */}
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  isDone ? "bg-emerald-100" : isFailed ? "bg-red-100" : step.iconBg
                }`}>
                  {isDone ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> :
                   isFailed ? <AlertTriangle className="h-5 w-5 text-red-600" /> :
                   <Icon className={`h-5 w-5 ${step.color}`} />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-slate-400">STEP {step.number}</span>
                    <h3 className="font-semibold text-slate-900">{step.title}</h3>
                    {step.agent !== "human" && (
                      <Badge className="bg-violet-100 text-violet-700 text-[10px]">
                        <Sparkles className="h-2.5 w-2.5 mr-1" />AI
                      </Badge>
                    )}
                    {result?.duration && (
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />{(result.duration / 1000).toFixed(1)}s
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">{step.description}</p>

                  {/* Result */}
                  {result && (
                    <div className={`mt-3 rounded-lg border p-3 ${isDone ? "border-emerald-200 bg-white" : "border-red-200 bg-white"}`}>
                      {isDone ? renderResult(step.id) : (
                        <p className="text-sm text-red-600">{String((result.data as Record<string, unknown>)?.error ?? "Failed")}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Action button */}
                <div className="shrink-0">
                  {isActive && !isDone && (
                    <Button
                      onClick={() => runStep(step)}
                      disabled={running}
                      className="bg-blue-600 hover:bg-blue-700 shadow-sm"
                    >
                      {running ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <ArrowRight className="h-4 w-4 mr-2" />
                      )}
                      {running ? "Running..." : "Run"}
                    </Button>
                  )}
                  {isDone && (
                    <Badge className="bg-emerald-100 text-emerald-700">Done</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Completion */}
      {currentStep >= DEMO_STEPS.length && (
        <Card className="border-emerald-300 bg-gradient-to-r from-emerald-50 to-green-50 shadow-md">
          <CardContent className="py-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-emerald-900">Full Lifecycle Complete</h2>
            <p className="text-sm text-emerald-700 mt-2">
              From client email to clearance notification — every step powered by AI agents with human oversight.
            </p>
            {caseId && (
              <Button asChild className="mt-4 bg-emerald-600 hover:bg-emerald-700">
                <a href={`/cases/${caseId}`}>View Created Case <ChevronRight className="h-4 w-4 ml-1" /></a>
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
