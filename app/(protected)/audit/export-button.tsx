"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export function ExportButton({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);

    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value) params.set(key, value);
    }

    const res = await fetch(`/api/audit/export?${params.toString()}`);
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-export-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setLoading(false);
  }

  return (
    <Button variant="outline" onClick={handleExport} disabled={loading}>
      <Download className="mr-1 h-4 w-4" />
      {loading ? "Exporting..." : "Export CSV"}
    </Button>
  );
}
