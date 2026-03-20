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

export function AuditFilters({
  eventTypes,
  entityTypes,
  currentFilters,
}: {
  eventTypes: string[];
  entityTypes: string[];
  currentFilters: {
    event_type?: string;
    entity_type?: string;
    actor_type?: string;
    search?: string;
  };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(currentFilters.search ?? "");

  function updateFilter(key: string, value: string | undefined) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`/audit?${params.toString()}`);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    updateFilter("search", search || undefined);
  }

  function clearFilters() {
    router.push("/audit");
    setSearch("");
  }

  const hasFilters = Object.values(currentFilters).some(Boolean);

  return (
    <div className="flex flex-wrap gap-3">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search actions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-56"
          />
        </div>
        <Button type="submit" variant="secondary" size="sm">Search</Button>
      </form>

      <Select
        value={currentFilters.event_type ?? ""}
        onValueChange={(v) => updateFilter("event_type", v || undefined)}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="All event types" />
        </SelectTrigger>
        <SelectContent>
          {eventTypes.map((t) => (
            <SelectItem key={t} value={t}>{t}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={currentFilters.entity_type ?? ""}
        onValueChange={(v) => updateFilter("entity_type", v || undefined)}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="All entities" />
        </SelectTrigger>
        <SelectContent>
          {entityTypes.map((t) => (
            <SelectItem key={t} value={t}>{t}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={currentFilters.actor_type ?? ""}
        onValueChange={(v) => updateFilter("actor_type", v || undefined)}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="All actors" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="user">User</SelectItem>
          <SelectItem value="agent">AI Agent</SelectItem>
          <SelectItem value="system">System</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="mr-1 h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  );
}
