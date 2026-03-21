import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, createServiceClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  STATUS_COLORS,
  PRIORITY_COLORS,
  VALID_STATUS_TRANSITIONS,
  REQUIRED_DOCS_BY_MODE,
} from "@/lib/types/database";
import type { CaseStatus, TransportMode, PriorityLevel } from "@/lib/types/database";
import { StatusChangeDropdown } from "./status-change";
import { CaseTimeline } from "./case-timeline";
import { CaseDocuments } from "./case-documents";
import { CaseTasks } from "./case-tasks";
import { CaseActivity } from "./case-activity";
import { CaseClassification } from "./case-classification";
import { CaseCommunications } from "./case-communications";
import { CaseFiling } from "./case-filing";
import { CaseMessages } from "./case-messages";
import { CaseISF } from "./case-isf";
import { CasePGA } from "./case-pga";
import { CaseFreight } from "./case-freight";
import { CaseDrayage } from "./case-drayage";
import { CaseTracking } from "./case-tracking";
import {
  Ship,
  Plane,
  Truck,
  TrainFront,
  AlertTriangle,
  FileText,
  ListChecks,
  Layers,
  Send,
  MessageSquare,
  Mail,
  Activity,
  Shield,
  Package,
  Anchor,
  MapPin,
  Eye,
  ChevronRight,
  User,
  Clock,
  CalendarDays,
} from "lucide-react";

// ============================================================================
// Helpers
// ============================================================================

const MODE_ICONS: Record<TransportMode, React.ElementType> = {
  ocean: Ship,
  air: Plane,
  truck: Truck,
  rail: TrainFront,
};

const MODE_COLORS: Record<TransportMode, string> = {
  ocean: "bg-blue-600",
  air: "bg-sky-500",
  truck: "bg-amber-600",
  rail: "bg-emerald-600",
};

const STATUS_ORDER: CaseStatus[] = [
  "intake",
  "awaiting_docs",
  "docs_validated",
  "classification_review",
  "entry_prep",
  "submitted",
  "govt_review",
  "released",
  "billing",
  "closed",
];

const STATUS_LABELS: Record<string, string> = {
  intake: "Intake",
  awaiting_docs: "Docs",
  docs_validated: "Validated",
  classification_review: "Classify",
  entry_prep: "Prep",
  submitted: "Filed",
  govt_review: "Review",
  released: "Released",
  billing: "Billing",
  closed: "Closed",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "\u2014";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatLabel(s: string): string {
  return s
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l: string) => l.toUpperCase());
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

function getEtaCountdown(eta: string | null): { text: string; overdue: boolean } {
  if (!eta) return { text: "\u2014", overdue: false };
  const diff = new Date(eta).getTime() - Date.now();
  const absDays = Math.abs(Math.floor(diff / (1000 * 60 * 60 * 24)));
  if (diff < 0) {
    if (absDays === 0) return { text: "today", overdue: false };
    return { text: `${absDays}d ago`, overdue: true };
  }
  if (absDays === 0) return { text: "today", overdue: false };
  if (absDays === 1) return { text: "in 1 day", overdue: false };
  return { text: `in ${absDays} days`, overdue: false };
}

function getInitials(name: string | undefined | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ============================================================================
// Pipeline component (horizontal dots with connecting lines)
// ============================================================================

function StatusPipeline({
  currentStatus,
  workflowEvents,
}: {
  currentStatus: CaseStatus;
  workflowEvents: { to_status: string }[];
}) {
  const visitedStatuses = new Set(workflowEvents.map((e) => e.to_status));
  const currentIdx = STATUS_ORDER.indexOf(currentStatus);
  const isOnHold = currentStatus === "hold";

  return (
    <div className="flex items-center gap-0">
      {STATUS_ORDER.map((status, idx) => {
        const isCompleted = visitedStatuses.has(status) && status !== currentStatus;
        const isCurrent = status === currentStatus;
        const isBeforeCurrent = idx < currentIdx;

        return (
          <div key={status} className="flex items-center">
            {/* Connecting line before dot (except first) */}
            {idx > 0 && (
              <div
                className={`h-0.5 w-3 sm:w-5 lg:w-7 transition-colors ${
                  isCompleted || isCurrent || isBeforeCurrent
                    ? "bg-green-400"
                    : "bg-slate-200"
                }`}
              />
            )}
            {/* Dot */}
            <div className="group relative flex flex-col items-center">
              {isCompleted || (isBeforeCurrent && !isCurrent) ? (
                <div className="h-2.5 w-2.5 rounded-full bg-green-500 transition-colors" />
              ) : isCurrent ? (
                <div className="relative flex items-center justify-center">
                  <div className="absolute h-5 w-5 rounded-full bg-blue-400/30 animate-ping" />
                  <div className="relative h-3 w-3 rounded-full bg-blue-500 ring-2 ring-blue-200" />
                </div>
              ) : (
                <div className="h-2.5 w-2.5 rounded-full border-[1.5px] border-slate-300 bg-white" />
              )}
              {/* Label on hover / always for current */}
              <span
                className={`absolute top-5 whitespace-nowrap text-[10px] leading-tight ${
                  isCurrent
                    ? "font-semibold text-blue-700"
                    : isCompleted
                    ? "text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    : "text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
                }`}
              >
                {STATUS_LABELS[status] ?? formatLabel(status)}
              </span>
            </div>
          </div>
        );
      })}
      {isOnHold && (
        <div className="flex items-center">
          <div className="h-0.5 w-3 sm:w-5 lg:w-7 bg-red-300" />
          <div className="relative flex items-center justify-center">
            <div className="absolute h-5 w-5 rounded-full bg-red-400/30 animate-ping" />
            <div className="h-3 w-3 rounded-full bg-red-500 ring-2 ring-red-200" />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Page
// ============================================================================

export default async function CaseDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createServiceClient();

  const { data: entryCase } = await supabase
    .from("entry_cases")
    .select(
      "*, client_account:client_accounts(*), assigned_user:users(id, full_name, email), business_unit:business_units(id, name)"
    )
    .eq("id", params.id)
    .single();

  if (!entryCase) notFound();

  const currentUser = await getCurrentUser();
  const client = getRelation(entryCase.client_account);
  const assignee = getRelation(entryCase.assigned_user);
  const bu = getRelation(entryCase.business_unit);
  const ModeIcon = MODE_ICONS[entryCase.mode_of_transport as TransportMode];
  const modeColor = MODE_COLORS[entryCase.mode_of_transport as TransportMode];
  const validNextStatuses =
    VALID_STATUS_TRANSITIONS[entryCase.status as CaseStatus] ?? [];
  const requiredDocs =
    REQUIRED_DOCS_BY_MODE[entryCase.mode_of_transport as TransportMode] ?? [];

  // Fetch related data
  const [docsRes, tasksRes, workflowRes, auditRes, aiLogsRes] =
    await Promise.all([
      supabase
        .from("documents")
        .select("*")
        .eq("entry_case_id", params.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("tasks")
        .select("*, assigned_user:users(id, full_name)")
        .eq("entry_case_id", params.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("workflow_events")
        .select("*, triggered_by:users(id, full_name)")
        .eq("entry_case_id", params.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("audit_events")
        .select("*")
        .eq("entity_id", params.id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("ai_action_logs")
        .select("*")
        .eq("entry_case_id", params.id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  const documents = docsRes.data ?? [];
  const tasks = tasksRes.data ?? [];
  const workflowEvents = workflowRes.data ?? [];
  const auditEvents = auditRes.data ?? [];
  const aiLogs = aiLogsRes.data ?? [];

  // Stats
  const openTasks = tasks.filter(
    (t) => t.status === "pending" || t.status === "in_progress"
  ).length;
  const completedTasks = tasks.filter(
    (t) => t.status === "completed"
  ).length;
  const uploadedDocTypes = new Set(documents.map((d) => d.doc_type));
  const mode = entryCase.mode_of_transport as TransportMode;
  const isOceanOrAir = mode === "ocean" || mode === "air";
  const isOcean = mode === "ocean";
  const hasTrucking = mode === "ocean" || mode === "truck";

  const docsUploaded = requiredDocs.filter((d) => uploadedDocTypes.has(d)).length;
  const docProgress =
    requiredDocs.length > 0
      ? Math.round((docsUploaded / requiredDocs.length) * 100)
      : 0;

  const taskProgress =
    tasks.length > 0
      ? Math.round((completedTasks / tasks.length) * 100)
      : 0;

  const etaInfo = getEtaCountdown(entryCase.eta);

  return (
    <div className="space-y-0">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-slate-500 mb-3">
        <Link
          href="/cases"
          className="hover:text-slate-800 transition-colors font-medium"
        >
          Cases
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
        <span className="font-medium text-slate-800">
          {entryCase.case_number}
        </span>
      </nav>

      {/* ================================================================ */}
      {/* Case Header Card                                                 */}
      {/* ================================================================ */}
      <Card className="mb-6 shadow-sm border-slate-200 overflow-hidden">
        <CardContent className="p-0">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between p-5">
            {/* Left: Icon + Case number + Client */}
            <div className="flex items-center gap-4 min-w-0">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${modeColor} shadow-sm`}
              >
                <ModeIcon className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-slate-900 font-mono tracking-tight truncate">
                  {entryCase.case_number}
                </h1>
                <p className="text-sm text-slate-500 truncate">
                  {client?.name ?? "Unknown client"}
                  {bu ? ` \u2014 ${bu.name}` : ""}
                </p>
              </div>
            </div>

            {/* Center: Status pipeline */}
            <div className="hidden lg:flex items-center justify-center flex-1 px-6 pb-2">
              <StatusPipeline
                currentStatus={entryCase.status as CaseStatus}
                workflowEvents={workflowEvents}
              />
            </div>

            {/* Right: Priority, ETA, assignee, actions */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Badge
                className={PRIORITY_COLORS[entryCase.priority as PriorityLevel]}
                variant="secondary"
              >
                {entryCase.priority === "urgent" && (
                  <AlertTriangle className="mr-1 h-3 w-3" />
                )}
                {formatLabel(entryCase.priority)}
              </Badge>

              <div
                className={`flex items-center gap-1.5 text-sm ${
                  etaInfo.overdue ? "text-red-600 font-semibold" : "text-slate-600"
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                <span>{etaInfo.text}</span>
              </div>

              {assignee ? (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-[11px] font-semibold text-slate-700">
                    {getInitials(assignee.full_name)}
                  </div>
                  <span className="hidden sm:inline">
                    {assignee.full_name}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-sm text-slate-400">
                  <User className="h-3.5 w-3.5" />
                  <span>Unassigned</span>
                </div>
              )}

              <StatusChangeDropdown
                caseId={entryCase.id}
                currentStatus={entryCase.status as CaseStatus}
                validNextStatuses={validNextStatuses}
              />
            </div>
          </div>

          {/* Mobile pipeline (visible on small / medium screens) */}
          <div className="border-t border-slate-100 px-5 py-3 lg:hidden overflow-x-auto">
            <StatusPipeline
              currentStatus={entryCase.status as CaseStatus}
              workflowEvents={workflowEvents}
            />
          </div>
        </CardContent>
      </Card>

      {/* ================================================================ */}
      {/* Tabs                                                             */}
      {/* ================================================================ */}
      <Tabs defaultValue="overview">
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList className="w-full justify-start bg-transparent border-b border-slate-200 rounded-none h-auto p-0 gap-0">
            <TabsTrigger
              value="overview"
              className="gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:font-semibold px-4 py-2.5 text-sm text-slate-600 data-[state=active]:text-blue-700"
            >
              <Eye className="h-3.5 w-3.5" />
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="documents"
              className="gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:font-semibold px-4 py-2.5 text-sm text-slate-600 data-[state=active]:text-blue-700"
            >
              <FileText className="h-3.5 w-3.5" />
              Docs
              <Badge
                variant="secondary"
                className="ml-1 h-5 min-w-[1.25rem] px-1.5 text-[10px] font-medium"
              >
                {documents.length}/{requiredDocs.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="tasks"
              className="gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:font-semibold px-4 py-2.5 text-sm text-slate-600 data-[state=active]:text-blue-700"
            >
              <ListChecks className="h-3.5 w-3.5" />
              Tasks
              {openTasks > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 h-5 min-w-[1.25rem] px-1.5 text-[10px] font-medium bg-amber-100 text-amber-800"
                >
                  {openTasks}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="classification"
              className="gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:font-semibold px-4 py-2.5 text-sm text-slate-600 data-[state=active]:text-blue-700"
            >
              <Layers className="h-3.5 w-3.5" />
              Classification
            </TabsTrigger>
            <TabsTrigger
              value="filing"
              className="gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:font-semibold px-4 py-2.5 text-sm text-slate-600 data-[state=active]:text-blue-700"
            >
              <Send className="h-3.5 w-3.5" />
              Filing
            </TabsTrigger>
            <TabsTrigger
              value="messages"
              className="gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:font-semibold px-4 py-2.5 text-sm text-slate-600 data-[state=active]:text-blue-700"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Messages
            </TabsTrigger>
            <TabsTrigger
              value="comms"
              className="gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:font-semibold px-4 py-2.5 text-sm text-slate-600 data-[state=active]:text-blue-700"
            >
              <Mail className="h-3.5 w-3.5" />
              Comms
            </TabsTrigger>
            <TabsTrigger
              value="activity"
              className="gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:font-semibold px-4 py-2.5 text-sm text-slate-600 data-[state=active]:text-blue-700"
            >
              <Activity className="h-3.5 w-3.5" />
              Activity
            </TabsTrigger>
            {isOcean && (
              <TabsTrigger
                value="isf"
                className="gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:font-semibold px-4 py-2.5 text-sm text-slate-600 data-[state=active]:text-blue-700"
              >
                <Shield className="h-3.5 w-3.5" />
                ISF
              </TabsTrigger>
            )}
            <TabsTrigger
              value="pga"
              className="gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:font-semibold px-4 py-2.5 text-sm text-slate-600 data-[state=active]:text-blue-700"
            >
              <Package className="h-3.5 w-3.5" />
              PGA
            </TabsTrigger>
            {isOceanOrAir && (
              <TabsTrigger
                value="freight"
                className="gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:font-semibold px-4 py-2.5 text-sm text-slate-600 data-[state=active]:text-blue-700"
              >
                <Anchor className="h-3.5 w-3.5" />
                Freight
              </TabsTrigger>
            )}
            {hasTrucking && (
              <TabsTrigger
                value="drayage"
                className="gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:font-semibold px-4 py-2.5 text-sm text-slate-600 data-[state=active]:text-blue-700"
              >
                <Truck className="h-3.5 w-3.5" />
                Drayage
              </TabsTrigger>
            )}
            <TabsTrigger
              value="tracking"
              className="gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:font-semibold px-4 py-2.5 text-sm text-slate-600 data-[state=active]:text-blue-700"
            >
              <MapPin className="h-3.5 w-3.5" />
              Tracking
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ============================================================== */}
        {/* Overview Tab                                                    */}
        {/* ============================================================== */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Left column */}
            <div className="space-y-6">
              {/* Shipment Details */}
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50">
                      <Ship className="h-4 w-4 text-blue-600" />
                    </div>
                    Shipment Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-1">
                        Mode
                      </p>
                      <div className="flex items-center gap-1.5">
                        <ModeIcon className="h-4 w-4 text-slate-600" />
                        <span className="text-sm font-medium capitalize">
                          {entryCase.mode_of_transport}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-1">
                        Status
                      </p>
                      <Badge
                        className={STATUS_COLORS[entryCase.status as CaseStatus]}
                        variant="secondary"
                      >
                        {formatLabel(entryCase.status)}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-1">
                        ETA
                      </p>
                      <p className="text-sm font-medium">
                        {formatDate(entryCase.eta)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-1">
                        Actual Arrival
                      </p>
                      <p className="text-sm font-medium">
                        {formatDate(entryCase.actual_arrival)}
                      </p>
                    </div>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Risk Score</span>
                      <span className="flex items-center gap-1.5">
                        {(entryCase.risk_score ?? 0) >= 0.6 && (
                          <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                        )}
                        <span
                          className={`font-semibold ${getRiskColor(entryCase.risk_score)}`}
                        >
                          {getRiskLabel(entryCase.risk_score)}
                          {entryCase.risk_score !== null &&
                            ` (${Math.round(entryCase.risk_score * 100)}%)`}
                        </span>
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Client Info */}
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100">
                      <User className="h-4 w-4 text-slate-600" />
                    </div>
                    Client Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Client</span>
                    <span className="font-medium">
                      {client?.name ?? "Unknown"}
                    </span>
                  </div>
                  {client?.importer_of_record_number && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">IOR Number</span>
                      <span className="font-mono text-xs bg-slate-50 px-2 py-0.5 rounded">
                        {client.importer_of_record_number}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Business Unit</span>
                    <span>{bu?.name ?? "\u2014"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Assigned To</span>
                    <span>{assignee?.full_name ?? "Unassigned"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Created</span>
                    <span>{formatDate(entryCase.created_at)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right column */}
            <div className="space-y-6">
              {/* Progress card */}
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-green-50">
                      <ListChecks className="h-4 w-4 text-green-600" />
                    </div>
                    Progress
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Documents progress */}
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-slate-700 font-medium">
                        Documents
                      </span>
                      <span className="text-slate-500 text-xs font-medium">
                        {docsUploaded} / {requiredDocs.length} uploaded
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          docProgress === 100 ? "bg-green-500" : "bg-blue-500"
                        }`}
                        style={{ width: `${docProgress}%` }}
                      />
                    </div>
                  </div>
                  {/* Tasks progress */}
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-slate-700 font-medium">
                        Tasks
                      </span>
                      <span className="text-slate-500 text-xs font-medium">
                        {completedTasks} / {tasks.length} done
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          taskProgress === 100 ? "bg-green-500" : "bg-emerald-500"
                        }`}
                        style={{ width: `${taskProgress}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Key Dates card */}
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-purple-50">
                      <CalendarDays className="h-4 w-4 text-purple-600" />
                    </div>
                    Key Dates
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Clock className="h-3.5 w-3.5" />
                      <span>ETA</span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium">
                        {formatDate(entryCase.eta)}
                      </span>
                      <span
                        className={`ml-2 text-xs ${
                          etaInfo.overdue ? "text-red-600 font-semibold" : "text-slate-400"
                        }`}
                      >
                        ({etaInfo.text})
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-slate-500">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>Arrival</span>
                    </div>
                    <span className="font-medium">
                      {formatDate(entryCase.actual_arrival)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-slate-500">
                      <CalendarDays className="h-3.5 w-3.5" />
                      <span>Created</span>
                    </div>
                    <span className="font-medium">
                      {formatDate(entryCase.created_at)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Timeline card */}
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-50">
                      <Activity className="h-4 w-4 text-indigo-600" />
                    </div>
                    Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CaseTimeline
                    currentStatus={entryCase.status as CaseStatus}
                    workflowEvents={workflowEvents}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ============================================================== */}
        {/* Remaining Tabs (existing components, unchanged)                */}
        {/* ============================================================== */}

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
              ((
                entryCase.metadata as Record<string, unknown>
              )?.approved_classifications as
                | { line_item_index: number; hts_code: string }[]
                | undefined) ?? []
            }
          />
        </TabsContent>

        <TabsContent value="filing" className="mt-4">
          <CaseFiling caseId={entryCase.id} />
        </TabsContent>

        <TabsContent value="messages" className="mt-4">
          <CaseMessages
            caseId={entryCase.id}
            clientAccountId={entryCase.client_account_id}
            tenantId={entryCase.tenant_id}
            currentUserId={currentUser?.id ?? ""}
            currentUserName={currentUser?.full_name ?? "Broker"}
          />
        </TabsContent>

        <TabsContent value="comms" className="mt-4">
          <CaseCommunications
            caseId={entryCase.id}
            commDrafts={
              ((
                entryCase.metadata as Record<string, unknown>
              )?.comm_drafts as
                | {
                    event_type: string;
                    subject: string;
                    body: string;
                    contact_name: string;
                    contact_email: string;
                    generated_at: string;
                    status: string;
                  }[]
                | undefined) ?? []
            }
            invoiceDraft={
              ((entryCase.metadata as Record<string, unknown>)
                ?.draft_invoice as {
                invoice_lines: {
                  description: string;
                  category: string;
                  quantity: number;
                  unit_price: number;
                  total: number;
                }[];
                subtotal: number;
                total: number;
                currency: string;
                generated_at: string;
              }) ?? null
            }
            sentEmails={
              ((
                entryCase.metadata as Record<string, unknown>
              )?.sent_emails as
                | {
                    to: string;
                    subject: string;
                    body: string;
                    event_type: string;
                    sent_at: string;
                    sent_by: string;
                    gmail_message_id?: string;
                  }[]
                | undefined) ?? []
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

        {isOcean && (
          <TabsContent value="isf" className="mt-4">
            <CaseISF caseId={entryCase.id} eta={entryCase.eta} />
          </TabsContent>
        )}

        <TabsContent value="pga" className="mt-4">
          <CasePGA caseId={entryCase.id} />
        </TabsContent>

        {isOceanOrAir && (
          <TabsContent value="freight" className="mt-4">
            <CaseFreight caseId={entryCase.id} />
          </TabsContent>
        )}

        {hasTrucking && (
          <TabsContent value="drayage" className="mt-4">
            <CaseDrayage caseId={entryCase.id} />
          </TabsContent>
        )}

        <TabsContent value="tracking" className="mt-4">
          <CaseTracking caseId={entryCase.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
