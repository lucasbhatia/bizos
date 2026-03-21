"use client";

import { useState, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

type ImportTarget = "client_accounts" | "contacts" | "entry_cases";

interface FieldMapping {
  sourceField: string;
  targetField: string;
}

interface PreviewRow {
  [key: string]: unknown;
}

interface ImportResult {
  success_count: number;
  error_count: number;
  errors: string[];
}

const TARGET_FIELDS: Record<ImportTarget, string[]> = {
  client_accounts: [
    "name",
    "importer_of_record_number",
    "sop_notes",
    "is_active",
  ],
  contacts: ["name", "email", "phone", "role", "is_primary"],
  entry_cases: [
    "case_number",
    "mode_of_transport",
    "status",
    "priority",
    "eta",
  ],
};

export default function MigrationsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [target, setTarget] = useState<ImportTarget>("client_accounts");
  const [rawData, setRawData] = useState<PreviewRow[]>([]);
  const [sourceFields, setSourceFields] = useState<string[]>([]);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [step, setStep] = useState<"upload" | "map" | "preview" | "result">(
    "upload"
  );
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        let parsed: PreviewRow[];

        if (file.name.endsWith(".json")) {
          parsed = JSON.parse(text) as PreviewRow[];
        } else if (file.name.endsWith(".csv")) {
          parsed = parseCsv(text);
        } else {
          setError("Unsupported file type. Please upload CSV or JSON.");
          return;
        }

        if (!Array.isArray(parsed) || parsed.length === 0) {
          setError("File must contain an array of records.");
          return;
        }

        setRawData(parsed);
        const fields = Object.keys(parsed[0]);
        setSourceFields(fields);

        // Auto-map matching field names
        const targetFields = TARGET_FIELDS[target];
        const autoMappings: FieldMapping[] = targetFields.map((tf) => {
          const match = fields.find(
            (sf) => sf.toLowerCase().replace(/[_\s-]/g, "") === tf.toLowerCase().replace(/[_\s-]/g, "")
          );
          return { sourceField: match ?? "", targetField: tf };
        });
        setMappings(autoMappings);
        setStep("map");
      } catch {
        setError("Failed to parse file. Please check the format.");
      }
    };
    reader.readAsText(file);
  }

  function parseCsv(text: string): PreviewRow[] {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    return lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      const row: PreviewRow = {};
      headers.forEach((h, i) => {
        row[h] = values[i] ?? "";
      });
      return row;
    });
  }

  function updateMapping(index: number, sourceField: string) {
    const updated = [...mappings];
    updated[index] = { ...updated[index], sourceField };
    setMappings(updated);
  }

  function getMappedPreview(): PreviewRow[] {
    return rawData.slice(0, 5).map((row) => {
      const mapped: PreviewRow = {};
      for (const m of mappings) {
        if (m.sourceField) {
          mapped[m.targetField] = row[m.sourceField];
        }
      }
      return mapped;
    });
  }

  async function executeImport() {
    setImporting(true);
    setProgress(0);

    // Transform data according to mappings
    const records = rawData.map((row) => {
      const mapped: Record<string, unknown> = {};
      for (const m of mappings) {
        if (m.sourceField) {
          mapped[m.targetField] = row[m.sourceField];
        }
      }
      return mapped;
    });

    // Send in batches of 100
    const batchSize = 100;
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    const totalBatches = Math.ceil(records.length / batchSize);

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      try {
        const res = await fetch("/api/admin/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target, records: batch }),
        });
        const json = (await res.json()) as {
          success_count: number;
          error_count: number;
          errors: string[];
        };
        successCount += json.success_count;
        errorCount += json.error_count;
        errors.push(...json.errors);
      } catch (err) {
        errorCount += batch.length;
        errors.push(err instanceof Error ? err.message : "Batch failed");
      }
      setProgress(Math.round(((i / batchSize + 1) / totalBatches) * 100));
    }

    setResult({
      success_count: successCount,
      error_count: errorCount,
      errors,
    });
    setStep("result");
    setImporting(false);
  }

  function resetWizard() {
    setRawData([]);
    setSourceFields([]);
    setMappings([]);
    setStep("upload");
    setResult(null);
    setError(null);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Data Migration</h1>
        <p className="text-sm text-slate-500">
          Import legacy data from CSV or JSON files
        </p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-4">
        {(["upload", "map", "preview", "result"] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                step === s
                  ? "bg-slate-900 text-white"
                  : i <
                      ["upload", "map", "preview", "result"].indexOf(step)
                    ? "bg-green-100 text-green-800"
                    : "bg-slate-100 text-slate-500"
              }`}
            >
              {i + 1}
            </div>
            <span className="text-sm capitalize text-slate-600">{s}</span>
            {i < 3 && (
              <div className="h-px w-8 bg-slate-200" />
            )}
          </div>
        ))}
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-2 pt-4">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <p className="text-sm text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Upload */}
      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Data File</CardTitle>
            <CardDescription>
              Select your import target and upload a CSV or JSON file.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Import Target</Label>
              <Select
                value={target}
                onValueChange={(v) => setTarget(v as ImportTarget)}
              >
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client_accounts">Clients</SelectItem>
                  <SelectItem value="contacts">Contacts</SelectItem>
                  <SelectItem value="entry_cases">
                    Historical Cases
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data File</Label>
              <div className="flex items-center gap-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Choose File
                </Button>
                <span className="text-sm text-slate-500">
                  CSV or JSON format
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Map fields */}
      {step === "map" && (
        <Card>
          <CardHeader>
            <CardTitle>Map Fields</CardTitle>
            <CardDescription>
              Map your source columns to BizOS fields. {rawData.length} records
              found.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mappings.map((m, i) => (
              <div key={m.targetField} className="flex items-center gap-4">
                <div className="w-48">
                  <Badge variant="secondary">{m.targetField}</Badge>
                </div>
                <span className="text-slate-400">&larr;</span>
                <Select
                  value={m.sourceField || "__none__"}
                  onValueChange={(v) =>
                    updateMapping(i, v === "__none__" ? "" : v)
                  }
                >
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select source field" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-- Skip --</SelectItem>
                    {sourceFields.map((sf) => (
                      <SelectItem key={sf} value={sf}>
                        {sf}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={resetWizard}>
                Back
              </Button>
              <Button onClick={() => setStep("preview")}>Preview</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Preview */}
      {step === "preview" && (
        <Card>
          <CardHeader>
            <CardTitle>Preview Import</CardTitle>
            <CardDescription>
              Showing first 5 of {rawData.length} records after mapping.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  {mappings
                    .filter((m) => m.sourceField)
                    .map((m) => (
                      <TableHead key={m.targetField}>
                        {m.targetField}
                      </TableHead>
                    ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {getMappedPreview().map((row, i) => (
                  <TableRow key={i}>
                    {mappings
                      .filter((m) => m.sourceField)
                      .map((m) => (
                        <TableCell key={m.targetField}>
                          {String(row[m.targetField] ?? "")}
                        </TableCell>
                      ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center gap-2 pt-4">
              <Button variant="outline" onClick={() => setStep("map")}>
                Back
              </Button>
              <Button onClick={executeImport} disabled={importing}>
                {importing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing... {progress}%
                  </>
                ) : (
                  `Import ${rawData.length} Records`
                )}
              </Button>
            </div>
            {importing && (
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full bg-slate-900 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Result */}
      {step === "result" && result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Import Complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-green-50 p-4">
                <p className="text-sm text-green-600">Successful</p>
                <p className="text-2xl font-bold text-green-800">
                  {result.success_count}
                </p>
              </div>
              <div className="rounded-lg bg-red-50 p-4">
                <p className="text-sm text-red-600">Errors</p>
                <p className="text-2xl font-bold text-red-800">
                  {result.error_count}
                </p>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div className="max-h-48 overflow-auto rounded-lg border p-3">
                {result.errors.map((err, i) => (
                  <p key={i} className="text-sm text-red-600">
                    {err}
                  </p>
                ))}
              </div>
            )}
            <Button onClick={resetWizard}>Import More Data</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
