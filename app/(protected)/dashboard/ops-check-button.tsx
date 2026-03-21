"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, Loader2, AlertTriangle, CheckCircle } from "lucide-react";

interface OpsResult {
  stuck_cases: { case_number: string; status: string; hours_stuck: number; severity: string; client_name: string }[];
  overdue_tasks: { title: string; hours_overdue: number; severity: string; case_number: string | null }[];
  missing_docs_cases: { case_number: string; client_name: string; hours_in_status: number }[];
  digest: { tasks_created: number; total_active_cases: number };
}

export function OpsCheckButton({ userRole }: { userRole: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OpsResult | null>(null);

  if (!["admin", "ops_manager"].includes(userRole)) return null;

  async function runCheck() {
    setLoading(true);
    try {
      const res = await fetch("/api/agents/ops-coordinator/run", {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.result as OpsResult);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold">AI Ops Check</h2>
        </div>
        <Button onClick={runCheck} disabled={loading} variant="outline" size="sm">
          {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Bot className="h-4 w-4 mr-1" />}
          Run Ops Check
        </Button>
      </div>

      {result && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Ops Check Complete — {result.digest.tasks_created} tasks created
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.stuck_cases.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Stuck Cases ({result.stuck_cases.length})</p>
                {result.stuck_cases.map((sc, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm py-1">
                    <Badge variant={sc.severity === "escalation" ? "destructive" : "secondary"} className="text-xs">
                      {sc.severity === "escalation" ? <AlertTriangle className="h-3 w-3 mr-1" /> : null}
                      {sc.severity}
                    </Badge>
                    <span className="font-medium">{sc.case_number}</span>
                    <span className="text-slate-500">{sc.client_name}</span>
                    <span className="text-xs text-slate-400">{sc.hours_stuck}h in {sc.status}</span>
                  </div>
                ))}
              </div>
            )}

            {result.overdue_tasks.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Overdue Tasks ({result.overdue_tasks.length})</p>
                {result.overdue_tasks.map((ot, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm py-1">
                    <Badge variant={ot.severity === "escalation" ? "destructive" : "secondary"} className="text-xs">{ot.severity}</Badge>
                    <span>{ot.title}</span>
                    <span className="text-xs text-slate-400">{ot.hours_overdue}h overdue</span>
                  </div>
                ))}
              </div>
            )}

            {result.missing_docs_cases.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Missing Documents ({result.missing_docs_cases.length})</p>
                {result.missing_docs_cases.map((md, i) => (
                  <div key={i} className="text-sm py-1">
                    <span className="font-medium">{md.case_number}</span>
                    <span className="text-slate-500 ml-2">{md.client_name}</span>
                    <span className="text-xs text-slate-400 ml-2">{md.hours_in_status}h waiting</span>
                  </div>
                ))}
              </div>
            )}

            {result.stuck_cases.length === 0 && result.overdue_tasks.length === 0 && result.missing_docs_cases.length === 0 && (
              <p className="text-sm text-green-600">All clear — no exceptions found.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
