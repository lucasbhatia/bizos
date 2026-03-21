"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Shield,
  ChevronDown,
  Download,
  Save,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

type ComplianceStatus = "not_started" | "in_progress" | "compliant" | "not_applicable";

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  status: ComplianceStatus;
  evidence: string;
}

interface TrustCategory {
  id: string;
  name: string;
  items: ChecklistItem[];
}

// ============================================================================
// SOC 2 Checklist Data
// ============================================================================

function createDefaultChecklist(): TrustCategory[] {
  return [
    {
      id: "security",
      name: "Security",
      items: [
        { id: "sec-1", title: "Access Control Policies", description: "Documented access control policies covering user provisioning, deprovisioning, and role-based access.", status: "not_started", evidence: "" },
        { id: "sec-2", title: "Multi-Factor Authentication", description: "MFA enforced for all user accounts accessing the system.", status: "not_started", evidence: "" },
        { id: "sec-3", title: "Encryption at Rest", description: "All data encrypted at rest using AES-256 or equivalent.", status: "not_started", evidence: "" },
        { id: "sec-4", title: "Encryption in Transit", description: "TLS 1.2+ enforced for all data in transit.", status: "not_started", evidence: "" },
        { id: "sec-5", title: "Firewall Configuration", description: "Network firewalls configured with least-privilege rules.", status: "not_started", evidence: "" },
        { id: "sec-6", title: "Vulnerability Scanning", description: "Regular automated vulnerability scanning of infrastructure and applications.", status: "not_started", evidence: "" },
        { id: "sec-7", title: "Penetration Testing", description: "Annual third-party penetration tests conducted.", status: "not_started", evidence: "" },
        { id: "sec-8", title: "Security Awareness Training", description: "All employees complete annual security awareness training.", status: "not_started", evidence: "" },
        { id: "sec-9", title: "Incident Response Plan", description: "Documented incident response plan with defined roles and communication procedures.", status: "not_started", evidence: "" },
        { id: "sec-10", title: "Logging and Monitoring", description: "Centralized logging with alerts for security events.", status: "not_started", evidence: "" },
        { id: "sec-11", title: "Change Management", description: "Formal change management process for system changes.", status: "not_started", evidence: "" },
        { id: "sec-12", title: "Vendor Risk Management", description: "Third-party vendors assessed for security risks.", status: "not_started", evidence: "" },
        { id: "sec-13", title: "Data Classification Policy", description: "Data classification scheme with handling procedures.", status: "not_started", evidence: "" },
        { id: "sec-14", title: "Endpoint Protection", description: "Endpoint detection and response on all workstations.", status: "not_started", evidence: "" },
        { id: "sec-15", title: "Physical Security", description: "Physical access controls for data centers and offices.", status: "not_started", evidence: "" },
      ],
    },
    {
      id: "availability",
      name: "Availability",
      items: [
        { id: "avl-1", title: "SLA Documentation", description: "Service Level Agreements documented and communicated.", status: "not_started", evidence: "" },
        { id: "avl-2", title: "Disaster Recovery Plan", description: "Documented DR plan with RTO and RPO targets.", status: "not_started", evidence: "" },
        { id: "avl-3", title: "Backup Procedures", description: "Automated backups with tested restore procedures.", status: "not_started", evidence: "" },
        { id: "avl-4", title: "Capacity Planning", description: "Infrastructure capacity monitored and planned.", status: "not_started", evidence: "" },
        { id: "avl-5", title: "Redundancy", description: "Critical systems have redundancy and failover.", status: "not_started", evidence: "" },
        { id: "avl-6", title: "Uptime Monitoring", description: "24/7 uptime monitoring with alerting.", status: "not_started", evidence: "" },
        { id: "avl-7", title: "Business Continuity Plan", description: "Business continuity plan documented and tested.", status: "not_started", evidence: "" },
        { id: "avl-8", title: "Incident Communication", description: "Status page and client communication during outages.", status: "not_started", evidence: "" },
      ],
    },
    {
      id: "processing_integrity",
      name: "Processing Integrity",
      items: [
        { id: "pi-1", title: "Input Validation", description: "All user inputs validated and sanitized.", status: "not_started", evidence: "" },
        { id: "pi-2", title: "Data Quality Checks", description: "Automated data quality and integrity checks.", status: "not_started", evidence: "" },
        { id: "pi-3", title: "Error Handling", description: "Comprehensive error handling preventing data corruption.", status: "not_started", evidence: "" },
        { id: "pi-4", title: "Audit Trail", description: "Complete audit trail for all data modifications.", status: "not_started", evidence: "" },
        { id: "pi-5", title: "Transaction Integrity", description: "Database transactions ensure ACID compliance.", status: "not_started", evidence: "" },
        { id: "pi-6", title: "Processing Monitoring", description: "Automated monitoring of processing pipelines.", status: "not_started", evidence: "" },
        { id: "pi-7", title: "Output Reconciliation", description: "Output data reconciled against expected results.", status: "not_started", evidence: "" },
        { id: "pi-8", title: "Quality Assurance", description: "QA testing before production deployments.", status: "not_started", evidence: "" },
        { id: "pi-9", title: "Version Control", description: "All code changes tracked in version control.", status: "not_started", evidence: "" },
        { id: "pi-10", title: "Deployment Pipeline", description: "Automated CI/CD pipeline with approval gates.", status: "not_started", evidence: "" },
      ],
    },
    {
      id: "confidentiality",
      name: "Confidentiality",
      items: [
        { id: "conf-1", title: "Data Access Restrictions", description: "Access to confidential data limited by role.", status: "not_started", evidence: "" },
        { id: "conf-2", title: "Non-Disclosure Agreements", description: "NDAs in place for employees and contractors.", status: "not_started", evidence: "" },
        { id: "conf-3", title: "Data Retention Policy", description: "Defined retention and disposal policies.", status: "not_started", evidence: "" },
        { id: "conf-4", title: "Secure Data Disposal", description: "Secure methods for data destruction.", status: "not_started", evidence: "" },
        { id: "conf-5", title: "Tenant Isolation", description: "Multi-tenant data isolated via RLS and tenant_id.", status: "not_started", evidence: "" },
        { id: "conf-6", title: "API Security", description: "API endpoints authenticated and rate-limited.", status: "not_started", evidence: "" },
        { id: "conf-7", title: "Secrets Management", description: "Secrets stored securely, rotated regularly.", status: "not_started", evidence: "" },
        { id: "conf-8", title: "Data Masking", description: "Sensitive data masked in non-production environments.", status: "not_started", evidence: "" },
      ],
    },
    {
      id: "privacy",
      name: "Privacy",
      items: [
        { id: "prv-1", title: "Privacy Policy", description: "Published privacy policy covering data collection and use.", status: "not_started", evidence: "" },
        { id: "prv-2", title: "Consent Management", description: "User consent obtained and documented.", status: "not_started", evidence: "" },
        { id: "prv-3", title: "Data Subject Rights", description: "Procedures for access, correction, and deletion requests.", status: "not_started", evidence: "" },
        { id: "prv-4", title: "Data Minimization", description: "Only necessary data collected and processed.", status: "not_started", evidence: "" },
        { id: "prv-5", title: "Cross-Border Transfers", description: "Compliance with data transfer regulations.", status: "not_started", evidence: "" },
        { id: "prv-6", title: "Privacy Impact Assessment", description: "PIAs conducted for new features processing personal data.", status: "not_started", evidence: "" },
        { id: "prv-7", title: "Cookie Policy", description: "Cookie usage disclosed and consent obtained.", status: "not_started", evidence: "" },
        { id: "prv-8", title: "Data Breach Notification", description: "Breach notification procedures within regulatory timelines.", status: "not_started", evidence: "" },
        { id: "prv-9", title: "Sub-Processor Management", description: "Sub-processors documented with DPAs in place.", status: "not_started", evidence: "" },
        { id: "prv-10", title: "Privacy Training", description: "Staff trained on privacy requirements and obligations.", status: "not_started", evidence: "" },
      ],
    },
  ];
}

const STATUS_CONFIG: Record<ComplianceStatus, { label: string; color: string }> = {
  not_started: { label: "Not Started", color: "bg-gray-100 text-gray-800" },
  in_progress: { label: "In Progress", color: "bg-yellow-100 text-yellow-800" },
  compliant: { label: "Compliant", color: "bg-green-100 text-green-800" },
  not_applicable: { label: "N/A", color: "bg-slate-100 text-slate-500" },
};

// ============================================================================
// Component
// ============================================================================

export default function ComplianceDashboard() {
  const [categories, setCategories] = useState<TrustCategory[]>(
    createDefaultChecklist()
  );
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    security: true,
  });
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  // Load from tenant settings on mount
  const loadChecklist = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/compliance");
      if (res.ok) {
        const json = (await res.json()) as { checklist: TrustCategory[] | null };
        if (json.checklist) {
          setCategories(json.checklist);
        }
      }
    } catch {
      // Use defaults on error
    }
  }, []);

  useEffect(() => {
    void loadChecklist();
  }, [loadChecklist]);

  function toggleCategory(id: string) {
    setOpenCategories((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function updateItemStatus(categoryId: string, itemId: string, status: ComplianceStatus) {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === categoryId
          ? {
              ...cat,
              items: cat.items.map((item) =>
                item.id === itemId ? { ...item, status } : item
              ),
            }
          : cat
      )
    );
  }

  function updateItemEvidence(categoryId: string, itemId: string, evidence: string) {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === categoryId
          ? {
              ...cat,
              items: cat.items.map((item) =>
                item.id === itemId ? { ...item, evidence } : item
              ),
            }
          : cat
      )
    );
  }

  async function saveChecklist() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/compliance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checklist: categories }),
      });
      if (res.ok) {
        setLastSaved(new Date().toLocaleTimeString());
      }
    } catch {
      // Silent fail
    } finally {
      setSaving(false);
    }
  }

  function exportCSV() {
    const headers = ["Category", "Item", "Description", "Status", "Evidence Notes"];
    const rows: string[][] = [];

    for (const cat of categories) {
      for (const item of cat.items) {
        rows.push([
          cat.name,
          item.title,
          item.description,
          STATUS_CONFIG[item.status].label,
          item.evidence,
        ]);
      }
    }

    const csvContent = [
      headers.join(","),
      ...rows.map((r) =>
        r.map((cell) => {
          const s = String(cell);
          if (s.includes(",") || s.includes('"') || s.includes("\n")) {
            return `"${s.replace(/"/g, '""')}"`;
          }
          return s;
        }).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `soc2-checklist-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Compute scores
  const allItems = categories.flatMap((c) => c.items);
  const applicableItems = allItems.filter((i) => i.status !== "not_applicable");
  const compliantItems = applicableItems.filter((i) => i.status === "compliant");
  const inProgressItems = applicableItems.filter((i) => i.status === "in_progress");
  const overallScore =
    applicableItems.length > 0
      ? Math.round((compliantItems.length / applicableItems.length) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            SOC 2 Compliance Dashboard
          </h1>
          <p className="text-sm text-slate-500">
            Type II readiness checklist across 5 trust service criteria
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button size="sm" onClick={saveChecklist} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {lastSaved && (
        <p className="text-xs text-green-600">Last saved at {lastSaved}</p>
      )}

      {/* Overall Readiness */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">
              Overall Readiness
            </p>
            <p className="text-3xl font-bold text-slate-900">{overallScore}%</p>
            <div className="mt-2 h-2 bg-slate-100 rounded overflow-hidden">
              <div
                className="h-full bg-green-500 rounded"
                style={{ width: `${overallScore}%` }}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">Compliant</p>
            <p className="text-3xl font-bold text-green-600">
              {compliantItems.length}
            </p>
            <p className="text-xs text-slate-400">
              of {applicableItems.length} applicable
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">In Progress</p>
            <p className="text-3xl font-bold text-yellow-600">
              {inProgressItems.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">Total Items</p>
            <p className="text-3xl font-bold text-slate-900">
              {allItems.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
        {categories.map((cat) => {
          const catApplicable = cat.items.filter(
            (i) => i.status !== "not_applicable"
          );
          const catCompliant = catApplicable.filter(
            (i) => i.status === "compliant"
          );
          const catScore =
            catApplicable.length > 0
              ? Math.round((catCompliant.length / catApplicable.length) * 100)
              : 0;

          return (
            <Card key={cat.id}>
              <CardContent className="pt-4 text-center">
                <Shield className="mx-auto h-5 w-5 text-slate-400 mb-1" />
                <p className="text-xs font-medium text-slate-500">{cat.name}</p>
                <p className="text-xl font-bold text-slate-900">{catScore}%</p>
                <p className="text-xs text-slate-400">
                  {catCompliant.length}/{catApplicable.length}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Checklist Categories */}
      <div className="space-y-4">
        {categories.map((cat) => (
          <Collapsible
            key={cat.id}
            open={openCategories[cat.id] ?? false}
            onOpenChange={() => toggleCategory(cat.id)}
          >
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      {cat.name}
                      <Badge variant="secondary" className="ml-2">
                        {cat.items.filter((i) => i.status === "compliant").length}
                        /{cat.items.length}
                      </Badge>
                    </CardTitle>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                        openCategories[cat.id] ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[200px]">Item</TableHead>
                          <TableHead className="hidden sm:table-cell">Description</TableHead>
                          <TableHead className="w-[150px]">Status</TableHead>
                          <TableHead className="hidden md:table-cell">Evidence Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cat.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium text-sm">
                              {item.title}
                              <p className="text-xs text-slate-400 sm:hidden mt-1">
                                {item.description}
                              </p>
                            </TableCell>
                            <TableCell className="text-sm text-slate-600 hidden sm:table-cell">
                              {item.description}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={item.status}
                                onValueChange={(v) =>
                                  updateItemStatus(
                                    cat.id,
                                    item.id,
                                    v as ComplianceStatus
                                  )
                                }
                              >
                                <SelectTrigger className="h-8 text-xs w-[130px]">
                                  <SelectValue>
                                    <Badge
                                      variant="secondary"
                                      className={
                                        STATUS_CONFIG[item.status].color
                                      }
                                    >
                                      {STATUS_CONFIG[item.status].label}
                                    </Badge>
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  {(
                                    Object.entries(STATUS_CONFIG) as [
                                      ComplianceStatus,
                                      { label: string; color: string },
                                    ][]
                                  ).map(([value, config]) => (
                                    <SelectItem key={value} value={value}>
                                      <Badge
                                        variant="secondary"
                                        className={config.color}
                                      >
                                        {config.label}
                                      </Badge>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <Input
                                className="h-8 text-xs"
                                placeholder="Evidence or notes..."
                                value={item.evidence}
                                onChange={(e) =>
                                  updateItemEvidence(
                                    cat.id,
                                    item.id,
                                    e.target.value
                                  )
                                }
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ))}
      </div>
    </div>
  );
}
