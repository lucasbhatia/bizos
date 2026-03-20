"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function TaskFilters({
  isManager,
  currentView,
  currentStatus,
  currentPriority,
}: {
  isManager: boolean;
  currentView: string;
  currentStatus?: string;
  currentPriority?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateFilter(key: string, value: string | undefined) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/tasks?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-3">
      {/* View toggle */}
      <div className="flex gap-1 rounded-md border p-0.5">
        <Button
          variant={currentView === "my" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => updateFilter("view", "my")}
        >
          My Tasks
        </Button>
        {isManager && (
          <Button
            variant={currentView === "all" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => updateFilter("view", "all")}
          >
            All Tasks
          </Button>
        )}
      </div>

      <Select
        value={currentStatus ?? ""}
        onValueChange={(v) => updateFilter("status", v || undefined)}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Open tasks" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="in_progress">In Progress</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
          <SelectItem value="cancelled">Cancelled</SelectItem>
          <SelectItem value="pending,in_progress">All Open</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={currentPriority ?? ""}
        onValueChange={(v) => updateFilter("priority", v || undefined)}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="All priorities" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="urgent">Urgent</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="normal">Normal</SelectItem>
          <SelectItem value="low">Low</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
