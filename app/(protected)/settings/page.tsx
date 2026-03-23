"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, Mail, CheckCircle2, XCircle, Wifi, WifiOff } from "lucide-react";

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
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
          <Settings className="h-5 w-5 text-slate-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
          <p className="text-sm text-slate-500">
            Manage integrations and system configuration
          </p>
        </div>
      </div>

      {/* Flash Message */}
      {flashMessage && (
        <div
          className={`rounded-lg px-4 py-3 text-sm flex items-center justify-between ${
            flashMessage.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {flashMessage.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            {flashMessage.text}
          </div>
          <button
            onClick={() => setFlashMessage(null)}
            className="ml-4 font-medium underline text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Email Integration Card */}
      <Card className="rounded-xl bg-white shadow-sm border">
        <CardHeader className="p-5 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                emailStatus?.connected ? "bg-green-100" : "bg-slate-100"
              }`}>
                <Mail className={`h-4 w-4 ${emailStatus?.connected ? "text-green-600" : "text-slate-500"}`} />
              </div>
              <div>
                <CardTitle className="text-base">Email Integration</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Connect Gmail to auto-process inbound emails
                </CardDescription>
              </div>
            </div>
            {!loading && (
              <Badge className={`rounded-full ${
                emailStatus?.connected
                  ? "bg-green-100 text-green-700"
                  : "bg-slate-100 text-slate-500"
              }`}>
                {emailStatus?.connected ? (
                  <><Wifi className="h-3 w-3 mr-1" /> Connected</>
                ) : (
                  <><WifiOff className="h-3 w-3 mr-1" /> Disconnected</>
                )}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-5 pt-2">
          {loading ? (
            <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500 text-center">
              Loading status...
            </div>
          ) : emailStatus?.connected ? (
            <>
              <div className="rounded-lg bg-slate-50 p-4 space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Status</span>
                  <span className="font-medium text-green-700 flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-green-500 inline-block" />
                    Connected
                  </span>
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
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSync} disabled={syncing}>
                  {syncing ? "Syncing..." : "Sync Now"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
              <Button className="bg-blue-600 hover:bg-blue-700" asChild>
                <a href="/api/email/auth">Connect Gmail</a>
              </Button>
            </div>
          )}

          {/* Sync Results Table */}
          {syncResults && syncResults.results.length > 0 && (
            <div className="mt-4 space-y-2">
              <h3 className="text-sm font-medium text-slate-700">
                Sync Results ({syncResults.processed} processed)
              </h3>
              <div className="max-h-64 overflow-y-auto rounded-xl border bg-white overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2.5 text-left font-medium text-slate-600">
                        From
                      </th>
                      <th className="px-3 py-2.5 text-left font-medium text-slate-600">
                        Subject
                      </th>
                      <th className="px-3 py-2.5 text-left font-medium text-slate-600">
                        Status
                      </th>
                      <th className="px-3 py-2.5 text-right font-medium text-slate-600">
                        Confidence
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {syncResults.results.map((r, idx) => (
                      <tr key={r.messageId} className={`hover:bg-blue-50/30 ${idx % 2 === 1 ? "bg-slate-50/50" : ""}`}>
                        <td className="px-3 py-2 text-slate-700 truncate max-w-[160px]">
                          {r.from}
                        </td>
                        <td className="px-3 py-2 text-slate-700 truncate max-w-[200px]">
                          {r.subject}
                        </td>
                        <td className="px-3 py-2">
                          <Badge
                            className={`rounded-full ${
                              r.success
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
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
