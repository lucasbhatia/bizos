"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Circle, Clock, ArrowRight } from "lucide-react";

type ChecklistStatus = "not_started" | "in_progress" | "completed";

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  category: string;
  dayTarget: number; // Target day in the 100-day plan
  status: ChecklistStatus;
  assignedUser: string;
  dueDate: string;
}

const STATUS_COLORS: Record<ChecklistStatus, string> = {
  not_started: "bg-slate-100 text-slate-600",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
};

const STATUS_ICONS: Record<ChecklistStatus, React.ElementType> = {
  not_started: Circle,
  in_progress: Clock,
  completed: CheckCircle2,
};

const DEFAULT_CHECKLIST: Omit<ChecklistItem, "dueDate" | "assignedUser">[] = [
  // Week 1-2: Discovery & Planning
  {
    id: "1",
    title: "Complete system access audit",
    description:
      "Inventory all existing systems, logins, and data sources from the acquired brokerage.",
    category: "Discovery",
    dayTarget: 3,
    status: "not_started",
  },
  {
    id: "2",
    title: "Map existing workflows",
    description:
      "Document current case management, filing, and billing workflows.",
    category: "Discovery",
    dayTarget: 7,
    status: "not_started",
  },
  {
    id: "3",
    title: "Identify key personnel",
    description:
      "List all licensed brokers, ops staff, and their responsibilities.",
    category: "Discovery",
    dayTarget: 5,
    status: "not_started",
  },
  {
    id: "4",
    title: "Client portfolio review",
    description:
      "Review all active client accounts, volumes, and special requirements.",
    category: "Discovery",
    dayTarget: 10,
    status: "not_started",
  },

  // Week 2-4: Data Migration
  {
    id: "5",
    title: "Export client data from legacy system",
    description:
      "Extract all client accounts, contacts, and billing terms to CSV/JSON.",
    category: "Data Migration",
    dayTarget: 14,
    status: "not_started",
  },
  {
    id: "6",
    title: "Import clients into BizOS",
    description:
      "Use the data migration tool to import client accounts and contacts.",
    category: "Data Migration",
    dayTarget: 17,
    status: "not_started",
  },
  {
    id: "7",
    title: "Import historical cases",
    description:
      "Migrate closed/archived cases for historical reference and reporting.",
    category: "Data Migration",
    dayTarget: 21,
    status: "not_started",
  },
  {
    id: "8",
    title: "Verify data integrity",
    description:
      "Cross-check imported records against legacy data for accuracy.",
    category: "Data Migration",
    dayTarget: 25,
    status: "not_started",
  },

  // Week 4-6: System Configuration
  {
    id: "9",
    title: "Configure business units",
    description:
      "Set up port offices, branch locations, and business unit structure.",
    category: "System Config",
    dayTarget: 28,
    status: "not_started",
  },
  {
    id: "10",
    title: "Set up user accounts",
    description:
      "Create accounts for all team members with appropriate roles.",
    category: "System Config",
    dayTarget: 30,
    status: "not_started",
  },
  {
    id: "11",
    title: "Configure commodity profiles",
    description:
      "Set up HTS classification profiles for common commodities handled.",
    category: "System Config",
    dayTarget: 35,
    status: "not_started",
  },
  {
    id: "12",
    title: "Set up billing templates",
    description:
      "Configure standard fee schedules and billing terms for each client.",
    category: "System Config",
    dayTarget: 35,
    status: "not_started",
  },

  // Week 6-8: Team Training
  {
    id: "13",
    title: "Admin training session",
    description:
      "Train designated admins on system configuration, user management, and reporting.",
    category: "Team Training",
    dayTarget: 42,
    status: "not_started",
  },
  {
    id: "14",
    title: "Ops team training",
    description:
      "Train operations staff on case management, document workflows, and task system.",
    category: "Team Training",
    dayTarget: 49,
    status: "not_started",
  },
  {
    id: "15",
    title: "Finance team training",
    description:
      "Train finance staff on invoicing, payment tracking, and reporting.",
    category: "Team Training",
    dayTarget: 49,
    status: "not_started",
  },
  {
    id: "16",
    title: "AI agent orientation",
    description:
      "Train team on AI-assisted classification, document parsing, and approval workflows.",
    category: "Team Training",
    dayTarget: 56,
    status: "not_started",
  },

  // Week 8-12: Go Live & Optimization
  {
    id: "17",
    title: "Parallel run: new cases in BizOS",
    description:
      "Begin processing new cases in BizOS while maintaining legacy system as backup.",
    category: "Go Live",
    dayTarget: 60,
    status: "not_started",
  },
  {
    id: "18",
    title: "Client communication rollout",
    description:
      "Notify clients of new system, provide portal access where applicable.",
    category: "Go Live",
    dayTarget: 65,
    status: "not_started",
  },
  {
    id: "19",
    title: "Decommission legacy system",
    description:
      "Complete cutover after verifying all workflows function correctly in BizOS.",
    category: "Go Live",
    dayTarget: 85,
    status: "not_started",
  },
  {
    id: "20",
    title: "100-day review",
    description:
      "Conduct comprehensive review of integration success, team adoption, and KPIs.",
    category: "Go Live",
    dayTarget: 100,
    status: "not_started",
  },
];

export default function PlaybookPage() {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const loadChecklist = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/tenants");
      if (!res.ok) {
        // Initialize with defaults
        initializeDefaults();
        return;
      }
      const data = (await res.json()) as {
        tenants: { id: string; settings?: Record<string, unknown> }[];
      };
      // Try to load from first tenant's settings
      if (data.tenants.length > 0) {
        const tenant = data.tenants[0];
        const settings = tenant.settings as
          | { playbook_checklist?: ChecklistItem[] }
          | undefined;
        if (settings?.playbook_checklist) {
          setItems(settings.playbook_checklist);
          setLoading(false);
          return;
        }
      }
      initializeDefaults();
    } catch {
      initializeDefaults();
    }
  }, []);

  function initializeDefaults() {
    const startDate = new Date();
    const initialized = DEFAULT_CHECKLIST.map((item) => {
      const due = new Date(startDate);
      due.setDate(due.getDate() + item.dayTarget);
      return {
        ...item,
        dueDate: due.toISOString().split("T")[0],
        assignedUser: "",
      };
    });
    setItems(initialized);
    setLoading(false);
  }

  useEffect(() => {
    void loadChecklist();
  }, [loadChecklist]);

  async function saveChecklist(updated: ChecklistItem[]) {
    setSaving(true);
    try {
      // Save to tenant settings via admin endpoint
      await fetch("/api/admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updateSettings: true,
          playbook_checklist: updated,
        }),
      });
    } catch {
      // Silently fail - data is still in local state
    } finally {
      setSaving(false);
    }
  }

  function updateItemStatus(id: string, status: ChecklistStatus) {
    const updated = items.map((item) =>
      item.id === id ? { ...item, status } : item
    );
    setItems(updated);
    void saveChecklist(updated);
  }

  function updateItemAssignee(id: string, assignedUser: string) {
    const updated = items.map((item) =>
      item.id === id ? { ...item, assignedUser } : item
    );
    setItems(updated);
    void saveChecklist(updated);
  }

  const completedCount = items.filter(
    (i) => i.status === "completed"
  ).length;
  const totalCount = items.length;
  const progressPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const categories = Array.from(
    new Set(items.map((i) => i.category))
  );
  const filteredItems =
    filterCategory === "all"
      ? items
      : items.filter((i) => i.category === filterCategory);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-slate-500">Loading playbook...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          100-Day Acquisition Playbook
        </h1>
        <p className="text-sm text-slate-500">
          Integration checklist for acquired brokerages
        </p>
      </div>

      {/* Progress overview */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Progress</CardTitle>
          <CardDescription>
            {completedCount} of {totalCount} tasks completed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Completion</span>
              <span className="font-medium">{progressPercent}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-green-600 transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900">
                {items.filter((i) => i.status === "not_started").length}
              </p>
              <p className="text-xs text-slate-500">Not Started</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {items.filter((i) => i.status === "in_progress").length}
              </p>
              <p className="text-xs text-slate-500">In Progress</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {completedCount}
              </p>
              <p className="text-xs text-slate-500">Completed</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <Select
          value={filterCategory}
          onValueChange={setFilterCategory}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {saving && (
          <span className="text-xs text-slate-400">Saving...</span>
        )}
      </div>

      {/* Checklist items */}
      <div className="space-y-3">
        {filteredItems.map((item) => {
          const StatusIcon = STATUS_ICONS[item.status];
          const isOverdue =
            item.status !== "completed" &&
            new Date(item.dueDate) < new Date();

          return (
            <Card
              key={item.id}
              className={
                item.status === "completed" ? "opacity-75" : ""
              }
            >
              <CardContent className="flex items-start gap-4 pt-4">
                <button
                  onClick={() => {
                    const next: ChecklistStatus =
                      item.status === "not_started"
                        ? "in_progress"
                        : item.status === "in_progress"
                          ? "completed"
                          : "not_started";
                    updateItemStatus(item.id, next);
                  }}
                  className="mt-0.5 shrink-0"
                >
                  <StatusIcon
                    className={`h-5 w-5 ${
                      item.status === "completed"
                        ? "text-green-600"
                        : item.status === "in_progress"
                          ? "text-blue-600"
                          : "text-slate-300"
                    }`}
                  />
                </button>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3
                      className={`font-medium ${
                        item.status === "completed"
                          ? "text-slate-500 line-through"
                          : "text-slate-900"
                      }`}
                    >
                      {item.title}
                    </h3>
                    <Badge
                      variant="secondary"
                      className={STATUS_COLORS[item.status]}
                    >
                      {item.status.replace("_", " ")}
                    </Badge>
                    <Badge variant="outline">{item.category}</Badge>
                    {isOverdue && (
                      <Badge variant="destructive">Overdue</Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">
                    {item.description}
                  </p>
                  <div className="flex items-center gap-4 pt-1">
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Clock className="h-3 w-3" />
                      Day {item.dayTarget}
                      <ArrowRight className="h-3 w-3" />
                      {item.dueDate}
                    </div>
                    <Input
                      className="h-7 w-40 text-xs"
                      placeholder="Assign to..."
                      value={item.assignedUser}
                      onChange={(e) =>
                        updateItemAssignee(item.id, e.target.value)
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
