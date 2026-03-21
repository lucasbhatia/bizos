"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Bot, ChevronDown, Check, Loader2, AlertTriangle, Search } from "lucide-react";

interface LineItem {
  description: string;
  quantity?: number;
  unit_price?: number;
  total?: number;
  country_of_origin?: string;
  hs_code_hint?: string;
}

interface Candidate {
  hts_code: string;
  description: string;
  confidence: number;
  duty_rate: string;
  rationale: string;
  gri_rules_applied: string[];
  why_it_might_be_wrong: string;
}

interface ClassificationResult {
  candidates: Candidate[];
  disambiguating_questions: { question: string; why_it_matters: string }[];
  requires_broker_review: boolean;
  notes: string;
}

function confidenceColor(c: number) {
  if (c >= 0.85) return "bg-green-100 text-green-800";
  if (c >= 0.7) return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-800";
}

function LineItemClassification({
  item,
  index,
  caseId,
  isLicensedBroker,
  approvedCode,
}: {
  item: LineItem;
  index: number;
  caseId: string;
  isLicensedBroker: boolean;
  approvedCode?: string;
}) {
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [logId, setLogId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [approved, setApproved] = useState(approvedCode);
  const [customDesc, setCustomDesc] = useState(item.description);

  async function getClassification() {
    setLoading(true);
    try {
      const res = await fetch("/api/agents/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productDescription: customDesc,
          countryOfOrigin: item.country_of_origin,
          caseId,
          lineItemIndex: index,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.result as ClassificationResult);
        setLogId(data.logId);
      }
    } finally {
      setLoading(false);
    }
  }

  async function approveCode(candidate: Candidate) {
    const res = await fetch("/api/agents/classify/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caseId,
        lineItemIndex: index,
        htsCode: candidate.hts_code,
        description: candidate.description,
        logId,
      }),
    });
    if (res.ok) {
      setApproved(candidate.hts_code);
    }
  }

  return (
    <Card className="mb-3">
      <CardContent className="py-3 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Line {index + 1}: {item.description}</p>
            <div className="flex gap-3 text-xs text-slate-500 mt-1">
              {item.quantity != null && <span>Qty: {item.quantity}</span>}
              {item.country_of_origin && <span>Origin: {item.country_of_origin}</span>}
              {item.hs_code_hint && <span>HS hint: {item.hs_code_hint}</span>}
            </div>
          </div>
          {approved ? (
            <Badge className="bg-green-100 text-green-800 shrink-0">
              <Check className="h-3 w-3 mr-1" />HTS: {approved}
            </Badge>
          ) : (
            <div className="flex gap-2 shrink-0">
              <Input
                value={customDesc}
                onChange={(e) => setCustomDesc(e.target.value)}
                className="h-7 text-xs w-48"
                placeholder="Refine description"
              />
              <Button size="sm" className="h-7" onClick={getClassification} disabled={loading}>
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3 mr-1" />}
                Get HTS
              </Button>
            </div>
          )}
        </div>

        {result && !approved && (
          <div className="space-y-2 mt-3">
            {result.requires_broker_review && (
              <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 p-2 rounded">
                <AlertTriangle className="h-3 w-3" />
                Licensed Broker review required — low confidence on all candidates
              </div>
            )}

            {result.candidates.map((candidate, ci) => (
              <Collapsible key={ci}>
                <div className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                  <div className="flex-1">
                    <span className="text-sm font-mono font-medium">{candidate.hts_code}</span>
                    <span className="text-xs text-slate-500 ml-2">{candidate.description}</span>
                    <span className="text-xs text-slate-400 ml-2">Duty: {candidate.duty_rate}</span>
                  </div>
                  <Badge className={`text-xs ${confidenceColor(candidate.confidence)}`}>
                    {(candidate.confidence * 100).toFixed(0)}%
                  </Badge>
                  {isLicensedBroker && (
                    <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => approveCode(candidate)}>
                      <Check className="h-3 w-3 mr-1" />Approve
                    </Button>
                  )}
                  <CollapsibleTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-6 px-1">
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent>
                  <div className="p-2 pl-4 text-xs space-y-1 border-l-2 border-slate-200 ml-2 mt-1">
                    <p><span className="font-medium">Rationale:</span> {candidate.rationale}</p>
                    <p className="text-slate-500"><span className="font-medium">GRI:</span> {candidate.gri_rules_applied.join(", ")}</p>
                    <p className="text-orange-600"><span className="font-medium">Why it might be wrong:</span> {candidate.why_it_might_be_wrong}</p>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}

            {result.disambiguating_questions.length > 0 && (
              <div className="bg-blue-50 rounded p-2 mt-2">
                <p className="text-xs font-medium text-blue-700">Questions to increase confidence:</p>
                {result.disambiguating_questions.map((q, qi) => (
                  <p key={qi} className="text-xs text-blue-600 mt-1">
                    • {q.question} <span className="text-blue-400">({q.why_it_matters})</span>
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function CaseClassification({
  caseId,
  documents,
  isLicensedBroker,
  approvedClassifications,
}: {
  caseId: string;
  documents: {
    id: string;
    doc_type: string;
    extracted_data: Record<string, unknown>;
  }[];
  isLicensedBroker: boolean;
  approvedClassifications: { line_item_index: number; hts_code: string }[];
}) {
  // Extract line items from commercial invoices
  const lineItems: LineItem[] = [];
  for (const doc of documents) {
    if (doc.doc_type === "commercial_invoice") {
      const data = doc.extracted_data as { line_items?: LineItem[] };
      if (data.line_items) {
        lineItems.push(...data.line_items);
      }
    }
  }

  const approvedMap = new Map(
    approvedClassifications.map((c) => [c.line_item_index, c.hts_code])
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <Bot className="h-5 w-5 text-blue-600" />
        <h3 className="text-sm font-medium">HTS Classification Assistant</h3>
        <Badge variant="outline" className="text-xs">Advisory Only — L0</Badge>
      </div>

      {!isLicensedBroker && (
        <div className="text-xs bg-yellow-50 text-yellow-700 p-2 rounded">
          Only licensed brokers can approve classification codes. You can request suggestions but must have a broker approve them.
        </div>
      )}

      {lineItems.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-slate-500 text-sm">
            No line items found. Upload and parse a commercial invoice first.
          </CardContent>
        </Card>
      ) : (
        lineItems.map((item, i) => (
          <LineItemClassification
            key={i}
            item={item}
            index={i}
            caseId={caseId}
            isLicensedBroker={isLicensedBroker}
            approvedCode={approvedMap.get(i)}
          />
        ))
      )}
    </div>
  );
}
