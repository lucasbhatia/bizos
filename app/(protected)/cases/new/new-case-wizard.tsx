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

const TRANSPORT_MODES: TransportMode[] = ["ocean", "air", "truck", "rail"];
const PRIORITIES = ["low", "normal", "high", "urgent"];

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
  const [requiredDocs, setRequiredDocs] = useState<DocType[]>([]);

  // Initialize required docs when mode changes
  function handleModeChange(m: TransportMode) {
    setMode(m);
    setRequiredDocs(REQUIRED_DOCS_BY_MODE[m] ?? []);
  }

  // Ensure docs are initialized on first render
  if (requiredDocs.length === 0 && mode) {
    setRequiredDocs(REQUIRED_DOCS_BY_MODE[mode] ?? []);
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

  return (
    <div className="space-y-6">
      {/* Step indicators */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                s === step
                  ? "bg-slate-900 text-white"
                  : s < step
                  ? "bg-green-100 text-green-700"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              {s}
            </div>
            {s < 3 && <div className="h-px w-8 bg-slate-200" />}
          </div>
        ))}
      </div>

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Client *</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mode of Transport *</Label>
                <Select value={mode} onValueChange={(v) => handleModeChange(v as TransportMode)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRANSPORT_MODES.map((m) => (
                      <SelectItem key={m} value={m}>{formatLabel(m)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                <Label>ETA</Label>
                <Input type="date" value={eta} onChange={(e) => setEta(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Business Unit</Label>
                <Select value={businessUnitId} onValueChange={setBusinessUnitId}>
                  <SelectTrigger><SelectValue placeholder="Select office" /></SelectTrigger>
                  <SelectContent>
                    {businessUnits.map((bu) => (
                      <SelectItem key={bu.id} value={bu.id}>{bu.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Reference Number</Label>
              <Input
                placeholder="PO number, booking ref, etc."
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!clientId}>
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Assign + Notes */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Assignment & Documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Assign Specialist</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger><SelectValue placeholder="Select specialist" /></SelectTrigger>
                <SelectContent>
                  {specialists.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Initial Notes</Label>
              <textarea
                className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                rows={3}
                placeholder="Any special instructions or notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Required Documents</Label>
              <div className="flex flex-wrap gap-2">
                {(Object.values(REQUIRED_DOCS_BY_MODE).flat().filter(
                  (v, i, a) => a.indexOf(v) === i
                ) as DocType[]).map((docType) => (
                  <Badge
                    key={docType}
                    variant={requiredDocs.includes(docType) ? "default" : "outline"}
                    className="cursor-pointer"
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

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => setStep(3)}>Next</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review + Create */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Review & Create</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}

            <div className="space-y-3 rounded-lg border p-4">
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <span className="text-slate-500">Client</span>
                <span className="font-medium">{clientName}</span>
                <span className="text-slate-500">Mode</span>
                <span className="font-medium capitalize">{mode}</span>
                <span className="text-slate-500">Priority</span>
                <span className="font-medium capitalize">{priority}</span>
                <span className="text-slate-500">ETA</span>
                <span className="font-medium">{eta || "Not set"}</span>
                <span className="text-slate-500">Business Unit</span>
                <span className="font-medium">{buName || "Not set"}</span>
                <span className="text-slate-500">Reference</span>
                <span className="font-medium">{reference || "—"}</span>
                <span className="text-slate-500">Assigned To</span>
                <span className="font-medium">{assigneeName || "Unassigned"}</span>
              </div>

              {notes && (
                <div className="border-t pt-2">
                  <p className="text-xs text-slate-500">Notes</p>
                  <p className="text-sm mt-1">{notes}</p>
                </div>
              )}

              <div className="border-t pt-2">
                <p className="text-xs text-slate-500 mb-1">Required Documents</p>
                <div className="flex flex-wrap gap-1">
                  {requiredDocs.map((d) => (
                    <Badge key={d} variant="secondary" className="text-xs">
                      {formatLabel(d)}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={handleCreate} disabled={loading}>
                {loading ? "Creating..." : "Create Case"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
