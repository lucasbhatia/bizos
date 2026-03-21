"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, ArrowUp, ArrowDown, Minus } from "lucide-react";

interface AgentScore {
  agentId: string;
  agentName: string;
  currentLevel: string;
  totalInvocations: number;
  acceptedCount: number;
  rejectedCount: number;
  modifiedCount: number;
  acceptRate: number;
  avgConfidence: number;
  score: number;
  recommendation: "maintain" | "promote" | "demote";
  eligible: boolean;
  reasons: string[];
}

const RECOMMENDATION_STYLES: Record<string, string> = {
  promote: "bg-green-100 text-green-800",
  demote: "bg-red-100 text-red-800",
  maintain: "bg-gray-100 text-gray-800",
};

const RECOMMENDATION_ICONS: Record<string, React.ElementType> = {
  promote: ArrowUp,
  demote: ArrowDown,
  maintain: Minus,
};

export default function PromotionDashboard() {
  const [scores, setScores] = useState<AgentScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchScores = useCallback(async () => {
    try {
      const res = await fetch("/api/agents/promotion");
      if (res.ok) {
        const data = await res.json();
        setScores(data.scores ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScores();
  }, [fetchScores]);

  async function handleAction(agentId: string, action: "promote" | "demote") {
    setActionLoading(agentId);
    try {
      const res = await fetch("/api/agents/promotion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, action }),
      });
      if (res.ok) {
        await fetchScores();
      }
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">Loading promotion data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/reports/agents">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Agent Reports
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Agent Autonomy Promotion Pipeline
          </h1>
          <p className="text-sm text-slate-500">
            Review agent performance scores and approve autonomy level changes
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">
              Eligible for Promotion
            </p>
            <p className="text-3xl font-bold text-green-600">
              {scores.filter((s) => s.recommendation === "promote").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">
              Flagged for Demotion
            </p>
            <p className="text-3xl font-bold text-red-600">
              {scores.filter((s) => s.recommendation === "demote").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">
              Total Agents Scored
            </p>
            <p className="text-3xl font-bold text-slate-900">{scores.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Agent scores table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Agent Scores</CardTitle>
        </CardHeader>
        <CardContent>
          {scores.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead className="text-right">Invocations</TableHead>
                  <TableHead className="text-right">Accept Rate</TableHead>
                  <TableHead className="text-right">Avg Confidence</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead>Recommendation</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scores.map((s) => {
                  const RecIcon = RECOMMENDATION_ICONS[s.recommendation];
                  return (
                    <TableRow key={s.agentId}>
                      <TableCell className="font-medium">
                        {s.agentName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{s.currentLevel}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {s.totalInvocations}
                      </TableCell>
                      <TableCell className="text-right">
                        {(s.acceptRate * 100).toFixed(0)}%
                      </TableCell>
                      <TableCell className="text-right">
                        {s.avgConfidence.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {s.score.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            RECOMMENDATION_STYLES[s.recommendation]
                          }
                        >
                          <RecIcon className="h-3 w-3 mr-1" />
                          {s.recommendation}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {s.recommendation === "promote" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-700 border-green-300"
                              onClick={() =>
                                handleAction(s.agentId, "promote")
                              }
                              disabled={actionLoading === s.agentId}
                            >
                              Approve
                            </Button>
                          )}
                          {s.recommendation === "demote" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-700 border-red-300"
                              onClick={() =>
                                handleAction(s.agentId, "demote")
                              }
                              disabled={actionLoading === s.agentId}
                            >
                              Confirm
                            </Button>
                          )}
                          {s.recommendation !== "maintain" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                /* no-op: dismiss */
                              }}
                              disabled={actionLoading === s.agentId}
                            >
                              Dismiss
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-slate-500 text-center py-8">
              No agents registered. Register agents to see promotion scores.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Detailed reasons per agent */}
      {scores
        .filter((s) => s.reasons.length > 0)
        .map((s) => (
          <Card key={`details-${s.agentId}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                {s.agentName} -- Analysis Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-600">
                {s.reasons.map((reason, i) => (
                  <li key={i}>{reason}</li>
                ))}
              </ul>
              <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                <div className="bg-green-50 rounded p-2 text-center">
                  <p className="text-xs text-green-600">Accepted</p>
                  <p className="font-bold text-green-800">{s.acceptedCount}</p>
                </div>
                <div className="bg-red-50 rounded p-2 text-center">
                  <p className="text-xs text-red-600">Rejected</p>
                  <p className="font-bold text-red-800">{s.rejectedCount}</p>
                </div>
                <div className="bg-orange-50 rounded p-2 text-center">
                  <p className="text-xs text-orange-600">Modified</p>
                  <p className="font-bold text-orange-800">
                    {s.modifiedCount}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
    </div>
  );
}
