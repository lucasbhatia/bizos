import { notFound } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { STATUS_COLORS, PRIORITY_COLORS, VALID_STATUS_TRANSITIONS, REQUIRED_DOCS_BY_MODE } from "@/lib/types/database";
import type { CaseStatus, TransportMode, DocType } from "@/lib/types/database";
import { StatusChangeDropdown } from "./status-change";
import { CaseTimeline } from "./case-timeline";
import { CaseDocuments } from "./case-documents";
import { CaseTasks } from "./case-tasks";
import { CaseActivity } from "./case-activity";
import { CaseClassification } from "./case-classification";
import { Ship, Plane, Truck, TrainFront, AlertTriangle } from "lucide-react";

const MODE_ICONS: Record<TransportMode, React.ElementType> = {
  ocean: Ship,
  air: Plane,
  truck: Truck,
  rail: TrainFront,
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getRiskColor(score: number | null): string {
  if (score === null) return "text-slate-400";
  if (score < 0.3) return "text-green-600";
  if (score < 0.6) return "text-yellow-600";
  return "text-red-600";
}

function getRiskLabel(score: number | null): string {
  if (score === null) return "Unknown";
  if (score < 0.3) return "Low";
  if (score < 0.6) return "Medium";
  return "High";
}

function getRelation<T>(val: T | T[] | null): T | null {
  if (Array.isArray(val)) return val[0] ?? null;
  return val;
}

export default async function CaseDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: entryCase } = await supabase
    .from("entry_cases")
    .select("*, client_account:client_accounts(*), assigned_user:users(id, full_name, email), business_unit:business_units(id, name)")
    .eq("id", params.id)
    .single();

  if (!entryCase) notFound();

  const currentUser = await getCurrentUser();
  const client = getRelation(entryCase.client_account);
  const assignee = getRelation(entryCase.assigned_user);
  const bu = getRelation(entryCase.business_unit);
  const ModeIcon = MODE_ICONS[entryCase.mode_of_transport as TransportMode];
  const validNextStatuses = VALID_STATUS_TRANSITIONS[entryCase.status as CaseStatus] ?? [];
  const requiredDocs = REQUIRED_DOCS_BY_MODE[entryCase.mode_of_transport as TransportMode] ?? [];

  // Fetch related data
  const [docsRes, tasksRes, workflowRes, auditRes, aiLogsRes] = await Promise.all([
    supabase.from("documents").select("*").eq("entry_case_id", params.id).order("created_at", { ascending: false }),
    supabase.from("tasks").select("*, assigned_user:users(id, full_name)").eq("entry_case_id", params.id).order("created_at", { ascending: false }),
    supabase.from("workflow_events").select("*, triggered_by:users(id, full_name)").eq("entry_case_id", params.id).order("created_at", { ascending: true }),
    supabase.from("audit_events").select("*").eq("entity_id", params.id).order("created_at", { ascending: false }).limit(50),
    supabase.from("ai_action_logs").select("*").eq("entry_case_id", params.id).order("created_at", { ascending: false }).limit(20),
  ]);

  const documents = docsRes.data ?? [];
  const tasks = tasksRes.data ?? [];
  const workflowEvents = workflowRes.data ?? [];
  const auditEvents = auditRes.data ?? [];
  const aiLogs = aiLogsRes.data ?? [];

  // Stats
  const openTasks = tasks.filter((t) => t.status === "pending" || t.status === "in_progress").length;
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const uploadedDocTypes = new Set(documents.map((d) => d.doc_type));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">
              {entryCase.case_number}
            </h1>
            <Badge className={STATUS_COLORS[entryCase.status as CaseStatus]} variant="secondary">
              {(entryCase.status as string).replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
            </Badge>
            <Badge className={PRIORITY_COLORS[entryCase.priority as keyof typeof PRIORITY_COLORS]} variant="secondary">
              {entryCase.priority}
            </Badge>
          </div>
          <p className="text-sm text-slate-500">
            {client?.name ?? "Unknown client"}
            {bu ? ` — ${bu.name}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <StatusChangeDropdown
            caseId={entryCase.id}
            currentStatus={entryCase.status as CaseStatus}
            validNextStatuses={validNextStatuses}
          />
        </div>
      </div>

      {/* Key info bar */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-slate-500">Mode</p>
            <div className="flex items-center gap-1 mt-1">
              <ModeIcon className="h-4 w-4 text-slate-600" />
              <span className="text-sm font-medium capitalize">{entryCase.mode_of_transport}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-slate-500">ETA</p>
            <p className="text-sm font-medium mt-1">{formatDate(entryCase.eta)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-slate-500">Arrival</p>
            <p className="text-sm font-medium mt-1">{formatDate(entryCase.actual_arrival)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-slate-500">Assigned To</p>
            <p className="text-sm font-medium mt-1">{assignee?.full_name ?? "Unassigned"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-slate-500">Risk Score</p>
            <div className="flex items-center gap-1 mt-1">
              {(entryCase.risk_score ?? 0) >= 0.6 && <AlertTriangle className="h-4 w-4 text-red-500" />}
              <span className={`text-sm font-medium ${getRiskColor(entryCase.risk_score)}`}>
                {getRiskLabel(entryCase.risk_score)}
                {entryCase.risk_score !== null && ` (${Math.round(entryCase.risk_score * 100)}%)`}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">
            Documents ({documents.length}/{requiredDocs.length})
          </TabsTrigger>
          <TabsTrigger value="tasks">
            Tasks ({openTasks} open)
          </TabsTrigger>
          <TabsTrigger value="classification">Classification</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Workflow Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <CaseTimeline
                  currentStatus={entryCase.status as CaseStatus}
                  workflowEvents={workflowEvents}
                />
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Key Dates</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Created</span>
                    <span>{formatDate(entryCase.created_at)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">ETA</span>
                    <span>{formatDate(entryCase.eta)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Actual Arrival</span>
                    <span>{formatDate(entryCase.actual_arrival)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Documents</span>
                    <span>{uploadedDocTypes.size} / {requiredDocs.length} required</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Tasks</span>
                    <span>{completedTasks} completed, {openTasks} open</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <CaseDocuments
            caseId={entryCase.id}
            documents={documents}
            requiredDocs={requiredDocs}
          />
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
          <CaseTasks caseId={entryCase.id} tasks={tasks} />
        </TabsContent>

        <TabsContent value="classification" className="mt-4">
          <CaseClassification
            caseId={entryCase.id}
            documents={documents.map((d) => ({
              id: d.id,
              doc_type: d.doc_type,
              extracted_data: d.extracted_data ?? {},
            }))}
            isLicensedBroker={currentUser?.is_licensed_broker ?? false}
            approvedClassifications={
              ((entryCase.metadata as Record<string, unknown>)?.approved_classifications as { line_item_index: number; hts_code: string }[]) ?? []
            }
          />
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <CaseActivity
            auditEvents={auditEvents}
            workflowEvents={workflowEvents}
            aiLogs={aiLogs}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
