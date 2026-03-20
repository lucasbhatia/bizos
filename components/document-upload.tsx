"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, Loader2 } from "lucide-react";
import type { DocType } from "@/lib/types/database";

const DOC_TYPES: DocType[] = [
  "commercial_invoice", "packing_list", "bill_of_lading",
  "airway_bill", "arrival_notice", "poa", "certificate_of_origin",
  "isf_data", "other",
];

function formatLabel(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export function DocumentUpload({ caseId }: { caseId: string }) {
  const [docType, setDocType] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleUpload() {
    if (!file || !docType) return;
    setError(null);
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("case_id", caseId);
    formData.append("doc_type", docType);

    const res = await fetch("/api/documents/upload", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      setFile(null);
      setDocType("");
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error ?? "Upload failed");
    }
    setUploading(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) setFile(droppedFile);
  }

  return (
    <div className="space-y-3 rounded-lg border border-dashed p-4">
      <div className="flex flex-wrap items-end gap-3">
        <Select value={docType} onValueChange={setDocType}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Document type" />
          </SelectTrigger>
          <SelectContent>
            {DOC_TYPES.map((dt) => (
              <SelectItem key={dt} value={dt}>
                {formatLabel(dt)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div
          className={`flex-1 min-w-48 rounded-md border-2 border-dashed p-3 text-center transition-colors ${
            dragActive ? "border-blue-400 bg-blue-50" : "border-slate-200"
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.tiff,.xlsx,.docx"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <p className="text-sm">{file.name} ({(file.size / 1024).toFixed(0)} KB)</p>
          ) : (
            <p className="text-sm text-slate-500">
              <Upload className="inline h-4 w-4 mr-1" />
              Drop file or click to browse
            </p>
          )}
        </div>

        <Button onClick={handleUpload} disabled={!file || !docType || uploading}>
          {uploading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
          {uploading ? "Uploading..." : "Upload"}
        </Button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
