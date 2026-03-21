"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";

interface InvoicesFiltersProps {
  clients: { id: string; name: string }[];
  currentFilters: {
    status?: string;
    client?: string;
    from?: string;
    to?: string;
    [key: string]: string | undefined;
  };
}

const STATUS_OPTIONS = ["draft", "sent", "paid", "overdue", "cancelled"];

function formatLabel(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export function InvoicesFilters({ clients, currentFilters }: InvoicesFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateFilter(key: string, value: string | undefined) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.push(`/finance?${params.toString()}`);
  }

  function clearFilters() {
    router.push("/finance");
  }

  const hasFilters = Object.keys(currentFilters).some(
    (k) => k !== "page" && currentFilters[k]
  );

  return (
    <div className="flex flex-wrap gap-3">
      {/* Status */}
      <Select
        value={currentFilters.status ?? ""}
        onValueChange={(v) => updateFilter("status", v || undefined)}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((s) => (
            <SelectItem key={s} value={s}>
              {formatLabel(s)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Client */}
      <Select
        value={currentFilters.client ?? ""}
        onValueChange={(v) => updateFilter("client", v || undefined)}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="All Clients" />
        </SelectTrigger>
        <SelectContent>
          {clients.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Date range */}
      <Input
        type="date"
        value={currentFilters.from ?? ""}
        onChange={(e) => updateFilter("from", e.target.value || undefined)}
        className="w-40"
        placeholder="From"
      />
      <Input
        type="date"
        value={currentFilters.to ?? ""}
        onChange={(e) => updateFilter("to", e.target.value || undefined)}
        className="w-40"
        placeholder="To"
      />

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="mr-1 h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  );
}
