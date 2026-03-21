"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";

interface ActiveFilter {
  key: string;
  label: string;
  value: string;
}

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
  activeFilters: ActiveFilter[];
}

const STATUS_OPTIONS = [
  "intake",
  "awaiting_docs",
  "docs_validated",
  "classification_review",
  "entry_prep",
  "submitted",
  "govt_review",
  "hold",
  "released",
  "billing",
  "closed",
  "archived",
];

const PRIORITY_OPTIONS = ["low", "normal", "high", "urgent"];

const FILTER_CHIP_COLORS: Record<string, string> = {
  status: "bg-blue-100 text-blue-800 hover:bg-blue-200",
  priority: "bg-orange-100 text-orange-800 hover:bg-orange-200",
  client: "bg-purple-100 text-purple-800 hover:bg-purple-200",
  assignee: "bg-teal-100 text-teal-800 hover:bg-teal-200",
  search: "bg-slate-100 text-slate-800 hover:bg-slate-200",
};

function formatLabel(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export function CasesFilters({
  clients,
  users,
  currentFilters,
  activeFilters,
}: CasesFiltersProps) {
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

  function removeFilter(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(key);
    params.delete("page");
    router.push(`/cases?${params.toString()}`);
    if (key === "search") setSearch("");
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    updateFilter("search", search || undefined);
  }

  function clearFilters() {
    router.push("/cases");
    setSearch("");
  }

  const hasFilters = activeFilters.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search cases..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-64 bg-white"
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
          <SelectTrigger className="w-44 bg-white">
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
          <SelectTrigger className="w-36 bg-white">
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
          <SelectTrigger className="w-48 bg-white">
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
          <SelectTrigger className="w-48 bg-white">
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
      </div>

      {/* Active filter chips */}
      {hasFilters && (
        <div className="flex flex-wrap items-center gap-2">
          {activeFilters.map((f, i) => (
            <button
              key={`${f.key}-${f.value}-${i}`}
              type="button"
              onClick={() => removeFilter(f.key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                FILTER_CHIP_COLORS[f.key] ?? "bg-slate-100 text-slate-800"
              }`}
            >
              <span className="capitalize">{f.key}:</span> {f.label}
              <X className="h-3 w-3 opacity-60" />
            </button>
          ))}
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs text-slate-500 hover:text-slate-700 underline underline-offset-2"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
