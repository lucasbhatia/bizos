"use client";

import { useState, useEffect, useCallback } from "react";
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
import { RefreshCw, Activity, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

interface HealthCheckResult {
  name: string;
  status: "ok" | "error";
  responseTimeMs: number;
  message?: string;
}

interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  checks: HealthCheckResult[];
  version: string;
  uptime: number;
}

// ============================================================================
// Component
// ============================================================================

export default function SystemHealthPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string>("");

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/health");
      const json = (await res.json()) as HealthResponse;
      setHealth(json);
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch health");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchHealth();
  }, [fetchHealth]);

  function formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  }

  const statusConfig = {
    healthy: {
      label: "Healthy",
      color: "bg-green-100 text-green-800",
      icon: CheckCircle2,
    },
    degraded: {
      label: "Degraded",
      color: "bg-yellow-100 text-yellow-800",
      icon: AlertTriangle,
    },
    unhealthy: {
      label: "Unhealthy",
      color: "bg-red-100 text-red-800",
      icon: XCircle,
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">System Health</h1>
          <p className="text-sm text-slate-500">
            Monitor system status, performance, and errors
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefreshed && (
            <span className="text-xs text-slate-400">
              Last checked: {lastRefreshed}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchHealth}
            disabled={loading}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <p className="text-sm text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {health && (
        <>
          {/* Overall Status */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  {(() => {
                    const config = statusConfig[health.status];
                    const Icon = config.icon;
                    return (
                      <>
                        <Icon className="h-8 w-8 text-slate-600" />
                        <div>
                          <p className="text-sm font-medium text-slate-500">
                            Overall Status
                          </p>
                          <Badge
                            variant="secondary"
                            className={config.color}
                          >
                            {config.label}
                          </Badge>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-slate-500">Version</p>
                <p className="text-2xl font-bold text-slate-900">
                  {health.version}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-slate-500">Uptime</p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatUptime(health.uptime)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-slate-500">
                  Subsystems
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl font-bold text-green-600">
                    {health.checks.filter((c) => c.status === "ok").length}
                  </span>
                  <span className="text-slate-400">/</span>
                  <span className="text-2xl font-bold text-slate-900">
                    {health.checks.length}
                  </span>
                  <span className="text-sm text-slate-500">OK</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Subsystem Checks */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Subsystem Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subsystem</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">
                        Response Time
                      </TableHead>
                      <TableHead className="hidden sm:table-cell">Message</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {health.checks.map((check) => (
                      <TableRow key={check.name}>
                        <TableCell className="font-medium capitalize">
                          {check.name.replace(/_/g, " ")}
                        </TableCell>
                        <TableCell>
                          {check.status === "ok" ? (
                            <Badge
                              variant="secondary"
                              className="bg-green-100 text-green-800"
                            >
                              OK
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="bg-red-100 text-red-800"
                            >
                              Error
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              check.responseTimeMs > 1000
                                ? "text-red-600"
                                : check.responseTimeMs > 500
                                  ? "text-yellow-600"
                                  : "text-green-600"
                            }
                          >
                            {check.responseTimeMs}ms
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-slate-500 hidden sm:table-cell">
                          {check.message ?? "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Environment Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Environment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  {
                    label: "Node Environment",
                    value: process.env.NODE_ENV ?? "unknown",
                  },
                  {
                    label: "Runtime",
                    value: typeof window !== "undefined" ? "Browser" : "Server",
                  },
                  {
                    label: "Platform",
                    value: "Next.js 14 (App Router)",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <span className="text-sm text-slate-500">{item.label}</span>
                    <Badge variant="outline">{item.value}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {loading && !health && (
        <div className="flex h-64 items-center justify-center">
          <p className="text-sm text-slate-500">Loading system health...</p>
        </div>
      )}
    </div>
  );
}
