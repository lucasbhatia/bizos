import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { PRIORITY_COLORS } from "@/lib/types/database";
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
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isOverdue(dueAt: string | null, status: string): boolean {
  if (!dueAt || status === "completed" || status === "cancelled") return false;
  return new Date(dueAt) < new Date();
}

function isDueSoon(dueAt: string | null, status: string): boolean {
  if (!dueAt || status === "completed" || status === "cancelled") return false;
  const due = new Date(dueAt);
  const now = new Date();
  const fourHours = 4 * 60 * 60 * 1000;
  return due.getTime() - now.getTime() < fourHours && due > now;
}

function getRelation<T>(val: T | T[] | null): T | null {
  if (Array.isArray(val)) return val[0] ?? null;
  return val;
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = createClient();
  const user = await getCurrentUser();
  const isManager = user && ["admin", "ops_manager", "broker_lead"].includes(user.role);
  const view = searchParams.view ?? "my";

  let query = supabase
    .from("tasks")
    .select("*, assigned_user:users(id, full_name), entry_case:entry_cases(id, case_number)")
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tasks</h1>
          <p className="text-sm text-slate-500">
            {view === "my" ? "My tasks" : "All tasks"} — {tasks?.length ?? 0} results
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

      <div className="grid gap-3">
        {tasks && tasks.length > 0 ? (
          tasks.map((task) => {
            const assignee = getRelation(task.assigned_user);
            const entryCase = getRelation(task.entry_case);
            const overdue = isOverdue(task.due_at, task.status);
            const dueSoon = isDueSoon(task.due_at, task.status);

            return (
              <Card key={task.id} className={overdue ? "border-red-300" : dueSoon ? "border-yellow-300" : ""}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{task.title}</p>
                      {task.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{task.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge className={TASK_STATUS_STYLES[task.status as TaskStatus]} variant="secondary">
                          {(task.status as string).replace("_", " ")}
                        </Badge>
                        <Badge className={PRIORITY_COLORS[task.priority as PriorityLevel]} variant="secondary">
                          {task.priority}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {(task.task_type as string).replace("_", " ")}
                        </Badge>
                        {assignee && (
                          <span className="text-xs text-slate-500">{assignee.full_name}</span>
                        )}
                        {entryCase && (
                          <Link href={`/cases/${entryCase.id}`} className="text-xs text-blue-600 hover:underline">
                            {entryCase.case_number}
                          </Link>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {task.due_at && (
                        <span className={`text-xs ${overdue ? "text-red-600 font-medium" : dueSoon ? "text-yellow-600" : "text-slate-500"}`}>
                          {overdue ? "Overdue — " : dueSoon ? "Due soon — " : "Due "}
                          {formatDate(task.due_at)}
                        </span>
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
          <p className="text-sm text-slate-500 text-center py-8">No tasks found</p>
        )}
      </div>
    </div>
  );
}
