import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PRIORITY_COLORS } from "@/lib/types/database";
import type { TaskStatus, PriorityLevel } from "@/lib/types/database";

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  task_type: string;
  status: TaskStatus;
  priority: PriorityLevel;
  due_at: string | null;
  completed_at: string | null;
  created_at: string;
  assigned_user: { id: string; full_name: string } | { id: string; full_name: string }[] | null;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getRelation<T>(val: T | T[] | null): T | null {
  if (Array.isArray(val)) return val[0] ?? null;
  return val;
}

function isOverdue(task: TaskRow): boolean {
  if (!task.due_at) return false;
  if (task.status === "completed" || task.status === "cancelled") return false;
  return new Date(task.due_at) < new Date();
}

const TASK_STATUS_STYLES: Record<TaskStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-800",
};

export function CaseTasks({
  caseId,
  tasks,
}: {
  caseId: string;
  tasks: TaskRow[];
}) {
  const openTasks = tasks.filter((t) => t.status !== "completed" && t.status !== "cancelled");
  const closedTasks = tasks.filter((t) => t.status === "completed" || t.status === "cancelled");

  return (
    <div className="space-y-4">
      {openTasks.length > 0 && (
        <>
          <h3 className="text-sm font-medium text-slate-500">Open Tasks ({openTasks.length})</h3>
          <div className="grid gap-3">
            {openTasks.map((task) => {
              const assignee = getRelation(task.assigned_user);
              const overdue = isOverdue(task);
              return (
                <Card key={task.id} className={overdue ? "border-red-300" : ""}>
                  <CardContent className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{task.title}</p>
                        {task.description && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{task.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className={TASK_STATUS_STYLES[task.status]} variant="secondary">
                            {task.status.replace("_", " ")}
                          </Badge>
                          <Badge className={PRIORITY_COLORS[task.priority]} variant="secondary">
                            {task.priority}
                          </Badge>
                          {assignee && (
                            <span className="text-xs text-slate-500">{assignee.full_name}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right text-xs flex-shrink-0">
                        {task.due_at && (
                          <p className={overdue ? "text-red-600 font-medium" : "text-slate-500"}>
                            Due {formatDate(task.due_at)}
                            {overdue && " (overdue)"}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {closedTasks.length > 0 && (
        <>
          <h3 className="text-sm font-medium text-slate-500 mt-6">
            Completed/Cancelled ({closedTasks.length})
          </h3>
          <div className="grid gap-2">
            {closedTasks.map((task) => (
              <div key={task.id} className="flex items-center gap-3 rounded-md border p-3 opacity-60">
                <div className="flex-1 min-w-0">
                  <p className="text-sm line-through">{task.title}</p>
                </div>
                <Badge className={TASK_STATUS_STYLES[task.status]} variant="secondary">
                  {task.status}
                </Badge>
              </div>
            ))}
          </div>
        </>
      )}

      {tasks.length === 0 && (
        <p className="text-sm text-slate-500 py-8 text-center">No tasks for this case</p>
      )}
    </div>
  );
}
