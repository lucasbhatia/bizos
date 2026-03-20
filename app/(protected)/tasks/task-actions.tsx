"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import type { TaskStatus } from "@/lib/types/database";

export function TaskActions({
  taskId,
  currentStatus,
  users,
}: {
  taskId: string;
  currentStatus: TaskStatus;
  users: { id: string; full_name: string }[];
}) {
  const router = useRouter();

  async function updateTask(updates: Record<string, string>) {
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task_id: taskId, ...updates }),
    });
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {(currentStatus === "pending" || currentStatus === "in_progress") && (
          <>
            <DropdownMenuItem onClick={() => updateTask({ status: "completed" })}>
              Mark Complete
            </DropdownMenuItem>
            {currentStatus === "pending" && (
              <DropdownMenuItem onClick={() => updateTask({ status: "in_progress" })}>
                Start Working
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => updateTask({ status: "cancelled" })}>
              Cancel
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Change Priority</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => updateTask({ priority: "urgent" })}>Urgent</DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateTask({ priority: "high" })}>High</DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateTask({ priority: "normal" })}>Normal</DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateTask({ priority: "low" })}>Low</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Reassign</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {users.map((u) => (
              <DropdownMenuItem key={u.id} onClick={() => updateTask({ assigned_user_id: u.id })}>
                {u.full_name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
