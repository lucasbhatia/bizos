"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Check, X, Pencil, ChevronDown, Bot, Loader2 } from "lucide-react";

interface ExtractedField {
  value: unknown;
  confidence: number;
  source: string;
  human_decision?: string;
  original_value?: unknown;
}

interface ExtractedData {
  classified_type?: string;
  classification_confidence?: number;
  fields?: Record<string, ExtractedField>;
  line_items?: Record<string, unknown>[];
  inconsistencies?: { field: string; issue: string; severity: string }[];
  overall_confidence?: number;
  error?: string;
}

function confidenceBadge(confidence: number) {
  if (confidence >= 0.85) return <Badge className="bg-green-100 text-green-800 text-xs">High {(confidence * 100).toFixed(0)}%</Badge>;
  if (confidence >= 0.7) return <Badge className="bg-yellow-100 text-yellow-800 text-xs">Med {(confidence * 100).toFixed(0)}%</Badge>;
  return <Badge className="bg-red-100 text-red-800 text-xs">Low {(confidence * 100).toFixed(0)}%</Badge>;
}

function formatLabel(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function FieldRow({
  name,
  field,
  documentId,
}: {
  name: string;
  field: ExtractedField;
  documentId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(field.value ?? ""));
  const [decision, setDecision] = useState(field.human_decision);
  const [saving, setSaving] = useState(false);

  async function submitDecision(d: "accepted" | "rejected" | "modified", modifiedValue?: unknown) {
    setSaving(true);
    try {
      await fetch("/api/documents/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId,
          field: name,
          decision: d,
          modifiedValue,
        }),
      });
      setDecision(d);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-3 py-2 border-b last:border-0">
      <div className="w-40 text-sm text-slate-500 shrink-0">{formatLabel(name)}</div>
      <div className="flex-1 text-sm font-medium min-w-0">
        {editing ? (
          <div className="flex gap-2">
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="h-7 text-sm"
            />
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2"
              disabled={saving}
              onClick={() => submitDecision("modified", editValue)}
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2"
              onClick={() => setEditing(false)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <span>{field.value != null ? String(field.value) : <span className="text-slate-400 italic">Not found</span>}</span>
        )}
      </div>
      {confidenceBadge(field.confidence)}
      {decision ? (
        <Badge variant={decision === "accepted" ? "default" : decision === "rejected" ? "destructive" : "secondary"} className="text-xs">
          {decision}
        </Badge>
      ) : (
        <div className="flex gap-1 shrink-0">
          <Button size="sm" variant="outline" className="h-6 px-2 text-xs" disabled={saving} onClick={() => submitDecision("accepted")}>
            <Check className="h-3 w-3 mr-1" />Accept
          </Button>
          <Button size="sm" variant="outline" className="h-6 px-2 text-xs" disabled={saving} onClick={() => submitDecision("rejected")}>
            <X className="h-3 w-3 mr-1" />Reject
          </Button>
          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" disabled={saving} onClick={() => setEditing(true)}>
            <Pencil className="h-3 w-3 mr-1" />Edit
          </Button>
        </div>
      )}
    </div>
  );
}

export function ExtractedFields({
  documentId,
  extractedData,
}: {
  documentId: string;
  extractedData: Record<string, unknown>;
}) {
  const data = extractedData as ExtractedData;

  if (data.error) {
    return (
      <Card className="border-red-200 mt-2">
        <CardContent className="py-3 text-sm text-red-600">
          Parsing failed: {data.error}
        </CardContent>
      </Card>
    );
  }

  if (!data.fields || Object.keys(data.fields).length === 0) {
    return null;
  }

  return (
    <Collapsible className="mt-2">
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="py-2 px-4 cursor-pointer hover:bg-slate-50 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-blue-600" />
              <CardTitle className="text-sm">AI Extracted Data</CardTitle>
              {data.overall_confidence != null && confidenceBadge(data.overall_confidence)}
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="px-4 pb-3">
            {data.classified_type && (
              <div className="text-xs text-slate-500 mb-2">
                Classified as: <span className="font-medium">{formatLabel(data.classified_type)}</span>
                {data.classification_confidence != null && ` (${(data.classification_confidence * 100).toFixed(0)}%)`}
              </div>
            )}

            {Object.entries(data.fields).map(([name, field]) => (
              <FieldRow key={name} name={name} field={field as ExtractedField} documentId={documentId} />
            ))}

            {data.line_items && data.line_items.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-slate-500 font-medium mb-1">Line Items ({data.line_items.length})</p>
                {data.line_items.map((item, i) => (
                  <div key={i} className="text-xs bg-slate-50 p-2 rounded mb-1">
                    {Object.entries(item).map(([k, v]) => (
                      <span key={k} className="mr-3">
                        <span className="text-slate-400">{formatLabel(k)}:</span> {String(v ?? "—")}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {data.inconsistencies && data.inconsistencies.length > 0 && (
              <div className="mt-3 p-2 bg-orange-50 rounded">
                <p className="text-xs font-medium text-orange-700 mb-1">Inconsistencies Found</p>
                {data.inconsistencies.map((inc, i) => (
                  <p key={i} className="text-xs text-orange-600">
                    <Badge variant="outline" className="text-xs mr-1 border-orange-300">{inc.severity}</Badge>
                    {inc.field}: {inc.issue}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export function ParseButton({
  documentId,
  parseStatus,
}: {
  documentId: string;
  parseStatus: string;
}) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(parseStatus === "completed");

  async function handleParse() {
    setLoading(true);
    try {
      const res = await fetch("/api/documents/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId }),
      });
      if (res.ok) {
        setDone(true);
        window.location.reload();
      }
    } finally {
      setLoading(false);
    }
  }

  if (done) return null;
  if (parseStatus === "processing") {
    return (
      <Button size="sm" variant="outline" className="h-6 text-xs" disabled>
        <Loader2 className="h-3 w-3 mr-1 animate-spin" />Processing
      </Button>
    );
  }

  return (
    <Button size="sm" variant="outline" className="h-6 text-xs" onClick={handleParse} disabled={loading}>
      {loading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Bot className="h-3 w-3 mr-1" />}
      Parse
    </Button>
  );
}
