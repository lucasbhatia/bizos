"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { InvoiceStatus } from "@/lib/types/database";

const TRANSITIONS: Record<InvoiceStatus, { label: string; status: InvoiceStatus; variant: "default" | "destructive" | "outline" }[]> = {
  draft: [
    { label: "Mark as Sent", status: "sent", variant: "default" },
    { label: "Cancel", status: "cancelled", variant: "destructive" },
  ],
  sent: [
    { label: "Record Payment", status: "paid", variant: "default" },
    { label: "Mark Overdue", status: "overdue", variant: "destructive" },
    { label: "Cancel", status: "cancelled", variant: "destructive" },
  ],
  overdue: [
    { label: "Record Payment", status: "paid", variant: "default" },
    { label: "Cancel", status: "cancelled", variant: "destructive" },
  ],
  paid: [],
  cancelled: [],
};

interface InvoiceActionsProps {
  invoiceId: string;
  currentStatus: InvoiceStatus;
  hasQboSync: boolean;
}

export function InvoiceActions({
  invoiceId,
  currentStatus,
  hasQboSync,
}: InvoiceActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const transitions = TRANSITIONS[currentStatus] ?? [];

  async function handleStatusChange(newStatus: InvoiceStatus) {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to update status");
        return;
      }

      router.refresh();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleQboSync() {
    setSyncLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/invoices/${invoiceId}/sync`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to sync to QuickBooks");
        return;
      }

      router.refresh();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setSyncLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {transitions.map((t) => (
        <Button
          key={t.status}
          variant={t.variant}
          className="w-full"
          disabled={loading}
          onClick={() => handleStatusChange(t.status)}
        >
          {loading ? "Updating..." : t.label}
        </Button>
      ))}

      {transitions.length === 0 && (
        <p className="text-sm text-slate-500">
          No actions available for {currentStatus} invoices.
        </p>
      )}

      {!hasQboSync && currentStatus !== "cancelled" && (
        <Button
          variant="outline"
          className="w-full"
          disabled={syncLoading}
          onClick={handleQboSync}
        >
          {syncLoading ? "Syncing..." : "Sync to QuickBooks"}
        </Button>
      )}

      {hasQboSync && (
        <p className="text-xs text-green-600 text-center">
          Synced to QuickBooks
        </p>
      )}

      {error && (
        <p className="text-sm text-red-600 text-center">{error}</p>
      )}
    </div>
  );
}
