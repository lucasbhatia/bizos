"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Download, Play, Save, Trash2, Plus, X } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

type DataSource = "cases" | "tasks" | "invoices" | "documents" | "agent_logs";

interface ColumnDef {
  key: string;
  label: string;
}

interface FilterDef {
  id: string;
  column: string;
  operator: string;
  value: string;
}

interface SortDef {
  column: string;
  direction: "asc" | "desc";
}

interface ReportConfig {
  name: string;
  source: DataSource;
  columns: string[];
  filters: FilterDef[];
  sort: SortDef | null;
}

interface SavedReport {
  id: string;
  name: string;
  config: ReportConfig;
  created_at: string;
}

// ============================================================================
// Column definitions per data source
// ============================================================================

const SOURCE_COLUMNS: Record<DataSource, ColumnDef[]> = {
  cases: [
    { key: "case_number", label: "Case Number" },
    { key: "status", label: "Status" },
    { key: "priority", label: "Priority" },
    { key: "mode_of_transport", label: "Transport Mode" },
    { key: "eta", label: "ETA" },
    { key: "actual_arrival", label: "Actual Arrival" },
    { key: "risk_score", label: "Risk Score" },
    { key: "created_at", label: "Created" },
    { key: "updated_at", label: "Updated" },
  ],
  tasks: [
    { key: "title", label: "Title" },
    { key: "task_type", label: "Type" },
    { key: "status", label: "Status" },
    { key: "priority", label: "Priority" },
    { key: "due_at", label: "Due Date" },
    { key: "completed_at", label: "Completed" },
    { key: "created_at", label: "Created" },
  ],
  invoices: [
    { key: "invoice_number", label: "Invoice Number" },
    { key: "status", label: "Status" },
    { key: "subtotal", label: "Subtotal" },
    { key: "tax", label: "Tax" },
    { key: "total", label: "Total" },
    { key: "currency", label: "Currency" },
    { key: "due_date", label: "Due Date" },
    { key: "paid_at", label: "Paid Date" },
    { key: "created_at", label: "Created" },
  ],
  documents: [
    { key: "file_name", label: "File Name" },
    { key: "doc_type", label: "Doc Type" },
    { key: "parse_status", label: "Parse Status" },
    { key: "file_size_bytes", label: "File Size" },
    { key: "version", label: "Version" },
    { key: "created_at", label: "Created" },
  ],
  agent_logs: [
    { key: "agent_type", label: "Agent Type" },
    { key: "action", label: "Action" },
    { key: "confidence", label: "Confidence" },
    { key: "human_decision", label: "Decision" },
    { key: "created_at", label: "Created" },
  ],
};

const FILTER_OPERATORS = [
  { value: "eq", label: "Equals" },
  { value: "neq", label: "Not Equals" },
  { value: "gt", label: "Greater Than" },
  { value: "gte", label: "Greater or Equal" },
  { value: "lt", label: "Less Than" },
  { value: "lte", label: "Less or Equal" },
  { value: "like", label: "Contains" },
];

const SOURCE_LABELS: Record<DataSource, string> = {
  cases: "Cases",
  tasks: "Tasks",
  invoices: "Invoices",
  documents: "Documents",
  agent_logs: "Agent Logs",
};

// ============================================================================
// Component
// ============================================================================

export default function CustomReportBuilderPage() {
  const [source, setSource] = useState<DataSource>("cases");
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterDef[]>([]);
  const [sort, setSort] = useState<SortDef | null>(null);
  const [reportName, setReportName] = useState("");

  const [results, setResults] = useState<Record<string, unknown>[] | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  const availableColumns = SOURCE_COLUMNS[source];

  // When source changes, reset columns/filters
  function handleSourceChange(newSource: DataSource) {
    setSource(newSource);
    setSelectedColumns([]);
    setFilters([]);
    setSort(null);
    setResults(null);
  }

  function toggleColumn(key: string) {
    setSelectedColumns((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]
    );
  }

  function selectAllColumns() {
    setSelectedColumns(availableColumns.map((c) => c.key));
  }

  function clearColumns() {
    setSelectedColumns([]);
  }

  function addFilter() {
    const firstCol = availableColumns[0]?.key ?? "id";
    setFilters((prev) => [
      ...prev,
      { id: crypto.randomUUID(), column: firstCol, operator: "eq", value: "" },
    ]);
  }

  function updateFilter(id: string, updates: Partial<FilterDef>) {
    setFilters((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  }

  function removeFilter(id: string) {
    setFilters((prev) => prev.filter((f) => f.id !== id));
  }

  const runReport = useCallback(async () => {
    if (selectedColumns.length === 0) {
      setError("Please select at least one column");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reports/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source,
          columns: selectedColumns,
          filters: filters.filter((f) => f.value.trim() !== ""),
          sort,
        }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error: string };
        throw new Error(body.error);
      }
      const json = (await res.json()) as {
        data: Record<string, unknown>[];
        count: number;
      };
      setResults(json.data);
      setTotalCount(json.count);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run report");
    } finally {
      setLoading(false);
    }
  }, [source, selectedColumns, filters, sort]);

  function exportCSV() {
    if (!results || results.length === 0) return;

    const headers = selectedColumns;
    const rows = results.map((row) =>
      headers.map((h) => {
        const val = row[h];
        if (val === null || val === undefined) return "";
        const str = String(val);
        // Escape CSV values
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      })
    );

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${source}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function saveReport() {
    if (!reportName.trim()) return;
    const config: ReportConfig = {
      name: reportName,
      source,
      columns: selectedColumns,
      filters,
      sort,
    };
    const saved: SavedReport = {
      id: crypto.randomUUID(),
      name: reportName,
      config,
      created_at: new Date().toISOString(),
    };
    setSavedReports((prev) => [...prev, saved]);
    setSaveDialogOpen(false);
    setReportName("");
  }

  function loadReport(report: SavedReport) {
    setSource(report.config.source);
    setSelectedColumns(report.config.columns);
    setFilters(report.config.filters);
    setSort(report.config.sort);
    setResults(null);
  }

  function deleteSavedReport(id: string) {
    setSavedReports((prev) => prev.filter((r) => r.id !== id));
  }

  const columnLabel = (key: string) =>
    availableColumns.find((c) => c.key === key)?.label ?? key;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Custom Report Builder
        </h1>
        <p className="text-sm text-slate-500">
          Build ad-hoc reports from any data source
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Left: Config */}
        <div className="lg:col-span-1 space-y-4">
          {/* Data Source */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Data Source</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={source}
                onValueChange={(v) => handleSourceChange(v as DataSource)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(SOURCE_COLUMNS) as DataSource[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {SOURCE_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Columns */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Columns</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAllColumns}>
                  All
                </Button>
                <Button variant="outline" size="sm" onClick={clearColumns}>
                  None
                </Button>
              </div>
              {availableColumns.map((col) => (
                <label
                  key={col.key}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedColumns.includes(col.key)}
                    onChange={() => toggleColumn(col.key)}
                    className="rounded border-gray-300"
                  />
                  {col.label}
                </label>
              ))}
            </CardContent>
          </Card>

          {/* Filters */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {filters.map((filter) => (
                <div key={filter.id} className="space-y-2 border-b pb-3">
                  <div className="flex items-center gap-1">
                    <Select
                      value={filter.column}
                      onValueChange={(v) =>
                        updateFilter(filter.id, { column: v })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableColumns.map((col) => (
                          <SelectItem key={col.key} value={col.key}>
                            {col.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => removeFilter(filter.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <Select
                    value={filter.operator}
                    onValueChange={(v) =>
                      updateFilter(filter.id, { operator: v })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FILTER_OPERATORS.map((op) => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    className="h-8 text-xs"
                    placeholder="Value..."
                    value={filter.value}
                    onChange={(e) =>
                      updateFilter(filter.id, { value: e.target.value })
                    }
                  />
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={addFilter}
              >
                <Plus className="mr-1 h-3 w-3" />
                Add Filter
              </Button>
            </CardContent>
          </Card>

          {/* Sort */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Sort</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Select
                value={sort?.column ?? "__none__"}
                onValueChange={(v) => {
                  if (v === "__none__") {
                    setSort(null);
                  } else {
                    setSort({ column: v, direction: sort?.direction ?? "desc" });
                  }
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="No sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No sort</SelectItem>
                  {availableColumns.map((col) => (
                    <SelectItem key={col.key} value={col.key}>
                      {col.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {sort && (
                <Select
                  value={sort.direction}
                  onValueChange={(v) =>
                    setSort({ ...sort, direction: v as "asc" | "desc" })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Ascending</SelectItem>
                    <SelectItem value="desc">Descending</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="space-y-2">
            <Button
              className="w-full"
              onClick={runReport}
              disabled={loading || selectedColumns.length === 0}
            >
              <Play className="mr-2 h-4 w-4" />
              {loading ? "Running..." : "Run Report"}
            </Button>

            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={selectedColumns.length === 0}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Configuration
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Report</DialogTitle>
                  <DialogDescription>
                    Save this report configuration for later use.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Label htmlFor="report-name">Report Name</Label>
                  <Input
                    id="report-name"
                    value={reportName}
                    onChange={(e) => setReportName(e.target.value)}
                    placeholder="My custom report"
                  />
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setSaveDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={saveReport}
                    disabled={!reportName.trim()}
                  >
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Saved Reports */}
          {savedReports.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Saved Reports</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {savedReports.map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between rounded border p-2"
                  >
                    <button
                      className="text-sm text-blue-600 hover:underline text-left truncate flex-1"
                      onClick={() => loadReport(report)}
                    >
                      {report.name}
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => deleteSavedReport(report.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Results */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">Results</CardTitle>
                {results && (
                  <p className="text-xs text-slate-500 mt-1">
                    {results.length} of {totalCount} records
                  </p>
                )}
              </div>
              {results && results.length > 0 && (
                <Button variant="outline" size="sm" onClick={exportCSV}>
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {error && (
                <p className="text-sm text-red-600 mb-4">{error}</p>
              )}

              {loading && (
                <div className="flex h-32 items-center justify-center">
                  <p className="text-sm text-slate-500">Running report...</p>
                </div>
              )}

              {!loading && !results && (
                <div className="flex h-32 items-center justify-center">
                  <p className="text-sm text-slate-500">
                    Configure your report and click Run
                  </p>
                </div>
              )}

              {!loading && results && results.length === 0 && (
                <div className="flex h-32 items-center justify-center">
                  <p className="text-sm text-slate-500">
                    No records match your criteria
                  </p>
                </div>
              )}

              {!loading && results && results.length > 0 && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {selectedColumns.map((col) => (
                          <TableHead key={col} className="whitespace-nowrap">
                            {columnLabel(col)}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.map((row, idx) => (
                        <TableRow key={idx}>
                          {selectedColumns.map((col) => {
                            const val = row[col];
                            let display: string;
                            if (val === null || val === undefined) {
                              display = "-";
                            } else if (
                              typeof val === "string" &&
                              /^\d{4}-\d{2}-\d{2}T/.test(val)
                            ) {
                              display = new Date(val).toLocaleDateString();
                            } else {
                              display = String(val);
                            }
                            return (
                              <TableCell
                                key={col}
                                className="whitespace-nowrap text-sm"
                              >
                                {col === "status" ||
                                col === "priority" ||
                                col === "task_type" ||
                                col === "doc_type" ||
                                col === "parse_status" ||
                                col === "human_decision" ? (
                                  <Badge variant="secondary">
                                    {display.replace(/_/g, " ")}
                                  </Badge>
                                ) : (
                                  display
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
