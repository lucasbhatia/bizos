import { getCurrentUser, createServiceClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { PRIORITY_COLORS } from "@/lib/types/database";
import { PRIORITY_COLOR_MAP } from "@/lib/design/tokens";
import type { TaskStatus, PriorityLevel } from "@/lib/types/database";
import { TaskFilters } from "./task-filters";
import { CreateTaskDialog } from "./create-task-dialog";
import { TaskActions } from "./task-actions";

interface SearchParams {
  view?: string;
  status?: string;
  priority?: string;
  page?: string;
}

const TASK_STATUS_STYLES: Record<TaskStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-800",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "\u2014";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatRelativeDate(dateStr: string | null): {
  text: string;
  isOverdue: boolean;
  isDueSoon: boolean;
} {
  if (!dateStr)
    return { text: "\u2014", isOverdue: false, isDueSoon: false };
  const now = new Date();
  const target = new Date(dateStr);
  const diffMs = target.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0)
    return {
      text:
        diffDays === -1
          ? "Yesterday"
          : `${Math.abs(diffDays)} days overdue`,
      isOverdue: true,
      isDueSoon: false,
    };
  if (diffDays === 0)
    return { text: "Due today", isOverdue: false, isDueSoon: true };
  if (diffDays === 1)
    return { text: "Due tomorrow", isOverdue: false, isDueSoon: true };
  if (diffDays <= 3)
    return {
      text: `Due in ${diffDays} days`,
      isOverdue: false,
      isDueSoon: true,
    };
  return {
    text: `Due in ${diffDays} days`,
    isOverdue: false,
    isDueSoon: false,
  };
}

function isOverdue(dueAt: string | null, status: string): boolean {
  if (!dueAt || status === "completed" || status === "cancelled") return false;
  return new Date(dueAt) < new Date();
}

function isDueSoon(dueAt: string | null, status: string): boolean {
  if (!dueAt || status === "completed" || status === "cancelled") return false;
  const due = new Date(dueAt);
  const now = new Date();
  const threeDays = 3 * 24 * 60 * 60 * 1000;
  return due.getTime() - now.getTime() < threeDays && due >= now;
}

function getRelation<T>(val: T | T[] | null): T | null {
  if (Array.isArray(val)) return val[0] ?? null;
  return val;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = createServiceClient();
  const user = await getCurrentUser();
  const isManager =
    user && ["admin", "ops_manager", "broker_lead"].includes(user.role);
  const view = searchParams.view ?? "my";

  let query = supabase
    .from("tasks")
    .select(
      "*, assigned_user:users(id, full_name), entry_case:entry_cases(id, case_number)"
    )
    .order("due_at", { ascending: true, nullsFirst: false });

  // View filter
  if (view === "my" && user) {
    query = query.eq("assigned_user_id", user.id);
  }

  // Status filter
  if (searchParams.status) {
    query = query.in("status", searchParams.status.split(","));
  } else {
    // Default: show open tasks
    query = query.in("status", ["pending", "in_progress"]);
  }

  if (searchParams.priority) {
    query = query.in("priority", searchParams.priority.split(","));
  }

  const { data: tasks } = await query;

  // Get users for task assignment
  const { data: users } = await supabase
    .from("users")
    .select("id, full_name, role")
    .eq("is_active", true)
    .order("full_name");

  const taskCount = tasks?.length ?? 0;
  const overdueCount =
    tasks?.filter((t) => isOverdue(t.due_at, t.status)).length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Tasks
            </h1>
            <Badge
              variant="secondary"
              className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600"
            >
              {taskCount}
            </Badge>
            {overdueCount > 0 && (
              <Badge
                variant="secondary"
                className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700"
              >
                {overdueCount} overdue
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {view === "my" ? "Your assigned tasks" : "All team tasks"}
          </p>
        </div>
        <CreateTaskDialog users={users ?? []} />
      </div>

      <TaskFilters
        isManager={!!isManager}
        currentView={view}
        currentStatus={searchParams.status}
        currentPriority={searchParams.priority}
      />

      <div className="grid gap-2.5">
        {tasks && tasks.length > 0 ? (
          tasks.map((task) => {
            const assignee = getRelation(task.assigned_user);
            const entryCase = getRelation(task.entry_case);
            const overdue = isOverdue(task.due_at, task.status);
            const dueSoon = isDueSoon(task.due_at, task.status);
            const priorityDot =
              PRIORITY_COLOR_MAP[task.priority as PriorityLevel].dot;
            const dueInfo =
              task.due_at &&
              task.status !== "completed" &&
              task.status !== "cancelled"
                ? formatRelativeDate(task.due_at)
                : null;

            return (
              <Card
                key={task.id}
                className={`overflow-hidden transition-colors hover:bg-slate-50/50 ${
                  overdue
                    ? "border-l-4 border-l-red-500 border-y border-r border-y-red-200 border-r-red-200"
                    : dueSoon
                      ? "border-l-4 border-l-amber-400 border-y border-r border-y-amber-200 border-r-amber-200"
                      : "border border-slate-200"
                }`}
              >
                <CardContent className="py-4 px-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Title row */}
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-block h-2 w-2 flex-shrink-0 rounded-full ${priorityDot}`}
                        />
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {task.title}
                        </p>
                      </div>

                      {/* Description */}
                      {task.description && (
                        <p className="ml-4 mt-1 text-xs text-slate-500 line-clamp-1">
                          {task.description}
                        </p>
                      )}

                      {/* Meta row */}
                      <div className="ml-4 mt-2.5 flex flex-wrap items-center gap-2">
                        <Badge
                          className={`${
                            TASK_STATUS_STYLES[task.status as TaskStatus]
                          } rounded-full px-2.5 py-0.5 text-xs font-medium`}
                          variant="secondary"
                        >
                          {(task.status as string).replace("_", " ")}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="rounded-full px-2 py-0.5 text-xs text-slate-500"
                        >
                          {(task.task_type as string).replace(/_/g, " ")}
                        </Badge>

                        {/* Assignee */}
                        {assignee && (
                          <div className="flex items-center gap-1.5">
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] font-semibold text-blue-700">
                              {getInitials(assignee.full_name)}
                            </div>
                            <span className="text-xs text-slate-500">
                              {assignee.full_name}
                            </span>
                          </div>
                        )}

                        {/* Case link */}
                        {entryCase && (
                          <Link
                            href={`/cases/${entryCase.id}`}
                            className="font-mono text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {entryCase.case_number}
                          </Link>
                        )}
                      </div>
                    </div>

                    {/* Right side: due date + actions */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {dueInfo && (
                        <div className="text-right">
                          <p
                            className={`text-xs font-medium ${
                              dueInfo.isOverdue
                                ? "text-red-600"
                                : dueInfo.isDueSoon
                                  ? "text-amber-600"
                                  : "text-slate-500"
                            }`}
                          >
                            {dueInfo.text}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {formatDate(task.due_at)}
                          </p>
                        </div>
                      )}
                      <TaskActions
                        taskId={task.id}
                        currentStatus={task.status as TaskStatus}
                        users={users ?? []}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white py-16 text-center shadow-sm">
            <p className="text-sm font-medium text-slate-600">
              No tasks found
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Adjust filters or create a new task
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
