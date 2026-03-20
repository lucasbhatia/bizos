"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CaseStatus } from "@/lib/types/database";

function formatLabel(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export function StatusChangeDropdown({
  caseId,
  currentStatus,
  validNextStatuses,
}: {
  caseId: string;
  currentStatus: CaseStatus;
  validNextStatuses: CaseStatus[];
}) {
  const [selected, setSelected] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  if (validNextStatuses.length === 0) return null;

  async function handleChange() {
    if (!selected) return;
    setLoading(true);

    const res = await fetch("/api/cases/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        case_id: caseId,
        new_status: selected,
      }),
    });

    if (res.ok) {
      router.refresh();
      setSelected("");
    } else {
      const data = await res.json();
      alert(data.error ?? "Failed to update status");
    }
    setLoading(false);
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={selected} onValueChange={setSelected}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Change status..." />
        </SelectTrigger>
        <SelectContent>
          {validNextStatuses.map((s) => (
            <SelectItem key={s} value={s}>
              {formatLabel(s)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button onClick={handleChange} disabled={!selected || loading} size="sm">
        {loading ? "Updating..." : "Update"}
      </Button>
    </div>
  );
}
