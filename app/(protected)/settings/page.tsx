"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface EmailStatus {
  connected: boolean;
  lastSyncAt: string | null;
  processedCount: number;
}

interface SyncResultItem {
  messageId: string;
  subject: string;
  from: string;
  success: boolean;
  confidence: number | null;
  error: string | null;
}

interface SyncResponse {
  processed: number;
  results: SyncResultItem[];
  message: string;
}

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const [emailStatus, setEmailStatus] = useState<EmailStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [syncResults, setSyncResults] = useState<SyncResponse | null>(null);
  const [flashMessage, setFlashMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fetchEmailStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/email/status");
      if (res.ok) {
        const data = (await res.json()) as EmailStatus;
        setEmailStatus(data);
      } else {
        setEmailStatus({ connected: false, lastSyncAt: null, processedCount: 0 });
      }
    } catch {
      setEmailStatus({ connected: false, lastSyncAt: null, processedCount: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmailStatus();
  }, [fetchEmailStatus]);

  useEffect(() => {
    const success = searchParams.get("email_success");
    const error = searchParams.get("email_error");

    if (success === "connected") {
      setFlashMessage({ type: "success", text: "Gmail connected successfully!" });
      fetchEmailStatus();
    } else if (error) {
      setFlashMessage({ type: "error", text: `Gmail connection failed: ${error}` });
    }
  }, [searchParams, fetchEmailStatus]);

  async function handleSync() {
    setSyncing(true);
    setSyncResults(null);
    try {
      const res = await fetch("/api/email/sync", { method: "POST" });
      const data = (await res.json()) as SyncResponse;
      setSyncResults(data);
      setFlashMessage({ type: "success", text: data.message });
      fetchEmailStatus();
    } catch {
      setFlashMessage({ type: "error", text: "Email sync failed" });
    } finally {
      setSyncing(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/email/disconnect", { method: "POST" });
      if (res.ok) {
        setFlashMessage({ type: "success", text: "Gmail disconnected" });
        setEmailStatus({ connected: false, lastSyncAt: null, processedCount: 0 });
        setSyncResults(null);
      } else {
        const err = (await res.json()) as { error: string };
        setFlashMessage({ type: "error", text: err.error });
      }
    } catch {
      setFlashMessage({ type: "error", text: "Failed to disconnect Gmail" });
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">
          Manage integrations and system configuration
        </p>
      </div>

      {flashMessage && (
        <div
          className={`rounded-md px-4 py-3 text-sm ${
            flashMessage.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {flashMessage.text}
          <button
            onClick={() => setFlashMessage(null)}
            className="ml-4 font-medium underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            Email Integration
            {!loading && (
              <Badge variant={emailStatus?.connected ? "default" : "secondary"}>
                {emailStatus?.connected ? "Connected" : "Disconnected"}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Connect your Gmail account to automatically process inbound emails
            through the Intake Agent.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-slate-500">Loading status...</p>
          ) : emailStatus?.connected ? (
            <>
              <div className="rounded-md bg-slate-50 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Status</span>
                  <span className="font-medium text-green-700">Connected</span>
                </div>
                {emailStatus.lastSyncAt && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Last synced</span>
                    <span className="font-medium text-slate-700">
                      {new Date(emailStatus.lastSyncAt).toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Emails processed</span>
                  <span className="font-medium text-slate-700">
                    {emailStatus.processedCount}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={handleSync} disabled={syncing}>
                  {syncing ? "Syncing..." : "Sync Now"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="text-red-600 hover:text-red-700"
                >
                  {disconnecting ? "Disconnecting..." : "Disconnect Gmail"}
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                No Gmail account connected. Connect your Gmail to start
                processing inbound emails automatically.
              </p>
              <Button asChild>
                <a href="/api/email/auth">Connect Gmail</a>
              </Button>
            </div>
          )}

          {syncResults && syncResults.results.length > 0 && (
            <div className="mt-4 space-y-2">
              <h3 className="text-sm font-medium text-slate-700">
                Sync Results ({syncResults.processed} processed)
              </h3>
              <div className="max-h-64 overflow-y-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-slate-600">
                        From
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-slate-600">
                        Subject
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-slate-600">
                        Status
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-slate-600">
                        Confidence
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {syncResults.results.map((r) => (
                      <tr key={r.messageId}>
                        <td className="px-3 py-2 text-slate-700 truncate max-w-[160px]">
                          {r.from}
                        </td>
                        <td className="px-3 py-2 text-slate-700 truncate max-w-[200px]">
                          {r.subject}
                        </td>
                        <td className="px-3 py-2">
                          <Badge
                            variant={r.success ? "default" : "secondary"}
                            className={
                              r.success
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }
                          >
                            {r.success ? "Processed" : "Failed"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-right text-slate-600">
                          {r.confidence !== null
                            ? `${Math.round(r.confidence * 100)}%`
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
