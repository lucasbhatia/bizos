"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { UserRole } from "@/lib/types/database";

interface BriefSection {
  overview: string;
  exceptions: string;
  achievements: string;
  recommendations: string;
}

interface BriefResult {
  success: boolean;
  result: {
    brief: BriefSection;
    dateRange: { start: string; end: string };
  };
  confidence: number;
  error?: string;
}

const ALLOWED_ROLES: UserRole[] = ["admin", "ops_manager"];

export function GenerateBriefButton({ userRole }: { userRole: UserRole }) {
  const [loading, setLoading] = useState(false);
  const [brief, setBrief] = useState<BriefResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!ALLOWED_ROLES.includes(userRole)) {
    return null;
  }

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setBrief(null);

    try {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

      const res = await fetch("/api/agents/executive-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: yesterday.toISOString().split("T")[0],
          endDate: today.toISOString().split("T")[0],
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error ?? "Failed to generate brief");
        return;
      }

      setBrief(data as BriefResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Button onClick={handleGenerate} disabled={loading} variant="default">
        {loading ? "Generating..." : "Generate Executive Brief"}
      </Button>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <p className="text-sm text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {brief && brief.result?.brief && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Executive Brief — {brief.result.dateRange.start} to{" "}
                {brief.result.dateRange.end}
              </CardTitle>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                Confidence: {(brief.confidence * 100).toFixed(0)}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <BriefSectionCard
              title="Overview"
              content={brief.result.brief.overview}
            />
            <BriefSectionCard
              title="Exceptions"
              content={brief.result.brief.exceptions}
            />
            <BriefSectionCard
              title="Achievements"
              content={brief.result.brief.achievements}
            />
            <BriefSectionCard
              title="Recommendations"
              content={brief.result.brief.recommendations}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function BriefSectionCard({
  title,
  content,
}: {
  title: string;
  content: string;
}) {
  return (
    <div className="rounded-lg border p-3">
      <h4 className="text-sm font-semibold text-slate-800 mb-1">{title}</h4>
      <p className="text-sm text-slate-600 whitespace-pre-wrap">{content}</p>
    </div>
  );
}
