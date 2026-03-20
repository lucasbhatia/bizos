"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";

interface CasesFiltersProps {
  clients: { id: string; name: string }[];
  users: { id: string; full_name: string }[];
  currentFilters: {
    status?: string;
    priority?: string;
    client?: string;
    assignee?: string;
    search?: string;
    [key: string]: string | undefined;
  };
}

const STATUS_OPTIONS = [
  "intake", "awaiting_docs", "docs_validated", "classification_review",
  "entry_prep", "submitted", "govt_review", "hold", "released",
  "billing", "closed", "archived",
];

const PRIORITY_OPTIONS = ["low", "normal", "high", "urgent"];

function formatLabel(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export function CasesFilters({ clients, users, currentFilters }: CasesFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(currentFilters.search ?? "");

  function updateFilter(key: string, value: string | undefined) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.push(`/cases?${params.toString()}`);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    updateFilter("search", search || undefined);
  }

  function clearFilters() {
    router.push("/cases");
    setSearch("");
  }

  const hasFilters = Object.keys(currentFilters).some(
    (k) => k !== "page" && currentFilters[k]
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search cases..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
        </form>

        {/* Status */}
        <Select
          value={currentFilters.status ?? ""}
          onValueChange={(v) => updateFilter("status", v || undefined)}
        >
          <SelectTrigger className="w-44">
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

        {/* Priority */}
        <Select
          value={currentFilters.priority ?? ""}
          onValueChange={(v) => updateFilter("priority", v || undefined)}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Priorities" />
          </SelectTrigger>
          <SelectContent>
            {PRIORITY_OPTIONS.map((p) => (
              <SelectItem key={p} value={p}>
                {formatLabel(p)}
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

        {/* Assignee */}
        <Select
          value={currentFilters.assignee ?? ""}
          onValueChange={(v) => updateFilter("assignee", v || undefined)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Assignees" />
          </SelectTrigger>
          <SelectContent>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="mr-1 h-4 w-4" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
