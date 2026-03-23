"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { REQUIRED_DOCS_BY_MODE } from "@/lib/types/database";
import type { TransportMode, DocType } from "@/lib/types/database";
import { Check } from "lucide-react";

const TRANSPORT_MODES: TransportMode[] = ["ocean", "air", "truck", "rail"];
const PRIORITIES = ["low", "normal", "high", "urgent"];

const STEP_LABELS = ["Basic Info", "Assignment", "Review"];

function formatLabel(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

interface WizardProps {
  clients: { id: string; name: string }[];
  users: { id: string; full_name: string; role?: string }[];
  businessUnits: { id: string; name: string }[];
}

export function NewCaseWizard({ clients, users, businessUnits }: WizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 fields
  const [clientId, setClientId] = useState("");
  const [mode, setMode] = useState<TransportMode>("ocean");
  const [priority, setPriority] = useState("normal");
  const [eta, setEta] = useState("");
  const [reference, setReference] = useState("");
  const [businessUnitId, setBusinessUnitId] = useState("");

  // Step 2 fields
  const [assigneeId, setAssigneeId] = useState("");
  const [notes, setNotes] = useState("");
  const [requiredDocs, setRequiredDocs] = useState<DocType[]>(REQUIRED_DOCS_BY_MODE["ocean"]);

  // Initialize required docs when mode changes
  function handleModeChange(m: TransportMode) {
    setMode(m);
    setRequiredDocs(REQUIRED_DOCS_BY_MODE[m] ?? []);
  }

  const specialists = users.filter(
    (u) => u.role === "specialist" || u.role === "ops_manager" || u.role === "admin"
  );

  async function handleCreate() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/cases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_account_id: clientId,
        business_unit_id: businessUnitId || undefined,
        assigned_user_id: assigneeId || undefined,
        mode_of_transport: mode,
        priority,
        eta: eta ? new Date(eta).toISOString() : undefined,
        metadata: {
          reference: reference || undefined,
          notes: notes || undefined,
          required_docs: requiredDocs,
        },
      }),
    });

    if (res.ok) {
      const data = await res.json();
      router.push(`/cases/${data.case.id}`);
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to create case");
      setLoading(false);
    }
  }

  const clientName = clients.find((c) => c.id === clientId)?.name;
  const assigneeName = specialists.find((u) => u.id === assigneeId)?.full_name;
  const buName = businessUnits.find((b) => b.id === businessUnitId)?.name;

  const progressPercent = ((step - 1) / 2) * 100;

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-between">
        {STEP_LABELS.map((label, idx) => {
          const s = idx + 1;
          return (
            <div key={label} className="flex items-center gap-2">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                    s === step
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                      : s < step
                      ? "bg-green-100 text-green-700"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {s < step ? <Check className="h-4 w-4" /> : s}
                </div>
                <span className={`text-xs font-medium ${
                  s === step ? "text-blue-600" : s < step ? "text-green-600" : "text-slate-400"
                }`}>
                  {label}
                </span>
              </div>
              {s < 3 && (
                <div className={`h-px w-16 sm:w-24 ${s < step ? "bg-green-300" : "bg-slate-200"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <Card className="rounded-xl bg-white shadow-sm border">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-lg">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-5 pt-0">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Client *</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className="h-10 rounded-lg focus:ring-2 focus:ring-blue-500"><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Mode of Transport *</Label>
                <Select value={mode} onValueChange={(v) => handleModeChange(v as TransportMode)}>
                  <SelectTrigger className="h-10 rounded-lg focus:ring-2 focus:ring-blue-500"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRANSPORT_MODES.map((m) => (
                      <SelectItem key={m} value={m}>{formatLabel(m)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="h-10 rounded-lg focus:ring-2 focus:ring-blue-500"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>{formatLabel(p)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">ETA</Label>
                <Input type="date" className="h-10 rounded-lg focus:ring-2 focus:ring-blue-500" value={eta} onChange={(e) => setEta(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Business Unit</Label>
                <Select value={businessUnitId} onValueChange={setBusinessUnitId}>
                  <SelectTrigger className="h-10 rounded-lg focus:ring-2 focus:ring-blue-500"><SelectValue placeholder="Select office" /></SelectTrigger>
                  <SelectContent>
                    {businessUnits.map((bu) => (
                      <SelectItem key={bu.id} value={bu.id}>{bu.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Reference Number</Label>
              <Input
                className="h-10 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="PO number, booking ref, etc."
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setStep(2)} disabled={!clientId}>
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Assign + Notes */}
      {step === 2 && (
        <Card className="rounded-xl bg-white shadow-sm border">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-lg">Assignment & Documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-5 pt-0">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Assign Specialist</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger className="h-10 rounded-lg focus:ring-2 focus:ring-blue-500"><SelectValue placeholder="Select specialist" /></SelectTrigger>
                <SelectContent>
                  {specialists.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Initial Notes</Label>
              <textarea
                className="flex w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                rows={3}
                placeholder="Any special instructions or notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Required Documents</Label>
              <div className="flex flex-wrap gap-2">
                {(Object.values(REQUIRED_DOCS_BY_MODE).flat().filter(
                  (v, i, a) => a.indexOf(v) === i
                ) as DocType[]).map((docType) => (
                  <Badge
                    key={docType}
                    variant={requiredDocs.includes(docType) ? "default" : "outline"}
                    className={`cursor-pointer rounded-full transition-colors ${
                      requiredDocs.includes(docType)
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "hover:bg-slate-100"
                    }`}
                    onClick={() => {
                      setRequiredDocs((prev) =>
                        prev.includes(docType)
                          ? prev.filter((d) => d !== docType)
                          : [...prev, docType]
                      );
                    }}
                  >
                    {formatLabel(docType)}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" className="rounded-lg" onClick={() => setStep(1)}>Back</Button>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setStep(3)}>Next</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review + Create */}
      {step === 3 && (
        <Card className="rounded-xl bg-white shadow-sm border">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-lg">Review & Create</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-5 pt-0">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
            )}

            <div className="space-y-3 rounded-xl border bg-slate-50/50 p-5">
              <div className="grid grid-cols-2 gap-y-3 text-sm">
                <span className="text-slate-500">Client</span>
                <span className="font-medium text-slate-800">{clientName}</span>
                <span className="text-slate-500">Mode</span>
                <span className="font-medium text-slate-800 capitalize">{mode}</span>
                <span className="text-slate-500">Priority</span>
                <span className="font-medium text-slate-800 capitalize">{priority}</span>
                <span className="text-slate-500">ETA</span>
                <span className="font-medium text-slate-800">{eta || "Not set"}</span>
                <span className="text-slate-500">Business Unit</span>
                <span className="font-medium text-slate-800">{buName || "Not set"}</span>
                <span className="text-slate-500">Reference</span>
                <span className="font-medium text-slate-800">{reference || "\u2014"}</span>
                <span className="text-slate-500">Assigned To</span>
                <span className="font-medium text-slate-800">{assigneeName || "Unassigned"}</span>
              </div>

              {notes && (
                <div className="border-t pt-3">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Notes</p>
                  <p className="text-sm mt-1 text-slate-700">{notes}</p>
                </div>
              )}

              <div className="border-t pt-3">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">Required Documents</p>
                <div className="flex flex-wrap gap-1.5">
                  {requiredDocs.map((d) => (
                    <Badge key={d} variant="secondary" className="rounded-full text-xs">
                      {formatLabel(d)}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" className="rounded-lg" onClick={() => setStep(2)}>Back</Button>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleCreate} disabled={loading}>
                {loading ? "Creating..." : "Create Case"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
