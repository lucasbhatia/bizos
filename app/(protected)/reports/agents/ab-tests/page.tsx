"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Plus, Trophy } from "lucide-react";

interface VariantMetrics {
  variant: "A" | "B";
  invocations: number;
  acceptCount: number;
  rejectCount: number;
  acceptRate: number;
  avgConfidence: number;
}

interface PromptTest {
  id: string;
  agentId: string;
  name: string;
  variantA: string;
  variantB: string;
  trafficSplit: number;
  status: "active" | "concluded";
  winner: "A" | "B" | null;
  createdAt: string;
}

interface TestWithMetrics extends PromptTest {
  variantAMetrics: VariantMetrics | null;
  variantBMetrics: VariantMetrics | null;
}

export default function ABTestsPage() {
  const [tests, setTests] = useState<TestWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Form state
  const [formAgentId, setFormAgentId] = useState("");
  const [formName, setFormName] = useState("");
  const [formVariantA, setFormVariantA] = useState("");
  const [formVariantB, setFormVariantB] = useState("");
  const [formSplit, setFormSplit] = useState("50");

  const fetchTests = useCallback(async () => {
    try {
      const res = await fetch("/api/agents/ab-tests");
      if (res.ok) {
        const data = await res.json();
        setTests(data.tests ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  async function handleCreate() {
    setActionLoading("create");
    try {
      const res = await fetch("/api/agents/ab-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          agentId: formAgentId,
          name: formName,
          variantA: formVariantA,
          variantB: formVariantB,
          trafficSplit: parseInt(formSplit, 10) / 100,
        }),
      });
      if (res.ok) {
        setShowCreate(false);
        setFormAgentId("");
        setFormName("");
        setFormVariantA("");
        setFormVariantB("");
        setFormSplit("50");
        await fetchTests();
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function handleConclude(testId: string, winner: "A" | "B") {
    setActionLoading(testId);
    try {
      const res = await fetch("/api/agents/ab-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "conclude", testId, winner }),
      });
      if (res.ok) {
        await fetchTests();
      }
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">Loading A/B tests...</p>
      </div>
    );
  }

  const activeTests = tests.filter((t) => t.status === "active");
  const concludedTests = tests.filter((t) => t.status === "concluded");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/reports/agents">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Agent Reports
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              A/B Prompt Testing
            </h1>
            <p className="text-sm text-slate-500">
              Compare prompt variants and measure agent performance
            </p>
          </div>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>
          <Plus className="h-4 w-4 mr-1" />
          New Test
        </Button>
      </div>

      {/* Create test form */}
      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create New A/B Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="agentId">Agent ID</Label>
                <Input
                  id="agentId"
                  placeholder="e.g., classification_agent"
                  value={formAgentId}
                  onChange={(e) => setFormAgentId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="testName">Test Name</Label>
                <Input
                  id="testName"
                  placeholder="e.g., Shorter classification prompt"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="variantA">Variant A (Control)</Label>
                <Textarea
                  id="variantA"
                  placeholder="Paste prompt variant A..."
                  value={formVariantA}
                  onChange={(e) => setFormVariantA(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="variantB">Variant B (Experiment)</Label>
                <Textarea
                  id="variantB"
                  placeholder="Paste prompt variant B..."
                  value={formVariantB}
                  onChange={(e) => setFormVariantB(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <div className="flex items-end gap-4">
              <div className="space-y-2 w-32">
                <Label htmlFor="split">
                  Traffic Split (% to A)
                </Label>
                <Input
                  id="split"
                  type="number"
                  min="10"
                  max="90"
                  value={formSplit}
                  onChange={(e) => setFormSplit(e.target.value)}
                />
              </div>
              <Button
                onClick={handleCreate}
                disabled={
                  !formAgentId ||
                  !formName ||
                  !formVariantA ||
                  !formVariantB ||
                  actionLoading === "create"
                }
              >
                Create Test
              </Button>
              <Button variant="ghost" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active tests */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Active Tests ({activeTests.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeTests.length > 0 ? (
            <div className="space-y-4">
              {activeTests.map((test) => (
                <div
                  key={test.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{test.name}</p>
                      <p className="text-sm text-slate-500">
                        Agent: {test.agentId} | Split:{" "}
                        {Math.round(test.trafficSplit * 100)}% A /{" "}
                        {Math.round((1 - test.trafficSplit) * 100)}% B
                      </p>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800">Active</Badge>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Variant</TableHead>
                        <TableHead className="text-right">
                          Invocations
                        </TableHead>
                        <TableHead className="text-right">Accepted</TableHead>
                        <TableHead className="text-right">
                          Accept Rate
                        </TableHead>
                        <TableHead className="text-right">
                          Avg Confidence
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(
                        [
                          { label: "A (Control)", metrics: test.variantAMetrics },
                          {
                            label: "B (Experiment)",
                            metrics: test.variantBMetrics,
                          },
                        ] as const
                      ).map(({ label, metrics }) => (
                        <TableRow key={label}>
                          <TableCell className="font-medium">{label}</TableCell>
                          <TableCell className="text-right">
                            {metrics?.invocations ?? 0}
                          </TableCell>
                          <TableCell className="text-right">
                            {metrics?.acceptCount ?? 0}
                          </TableCell>
                          <TableCell className="text-right">
                            {metrics
                              ? `${(metrics.acceptRate * 100).toFixed(0)}%`
                              : "N/A"}
                          </TableCell>
                          <TableCell className="text-right">
                            {metrics
                              ? metrics.avgConfidence.toFixed(2)
                              : "N/A"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-700 border-green-300"
                      onClick={() => handleConclude(test.id, "A")}
                      disabled={actionLoading === test.id}
                    >
                      <Trophy className="h-3 w-3 mr-1" />
                      A Wins
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-blue-700 border-blue-300"
                      onClick={() => handleConclude(test.id, "B")}
                      disabled={actionLoading === test.id}
                    >
                      <Trophy className="h-3 w-3 mr-1" />
                      B Wins
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-4">
              No active tests. Create one to get started.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Concluded tests */}
      {concludedTests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Concluded Tests ({concludedTests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test Name</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Winner</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {concludedTests.map((test) => (
                  <TableRow key={test.id}>
                    <TableCell className="font-medium">{test.name}</TableCell>
                    <TableCell>{test.agentId}</TableCell>
                    <TableCell>
                      <Badge className="bg-green-100 text-green-800">
                        <Trophy className="h-3 w-3 mr-1" />
                        Variant {test.winner}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {new Date(test.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
