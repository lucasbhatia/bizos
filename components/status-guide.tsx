"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, ChevronDown, ChevronUp } from "lucide-react";

const STATUS_DEFINITIONS = [
  { status: "intake", label: "Intake", description: "New case, initial review needed", color: "bg-yellow-100 text-yellow-800" },
  { status: "awaiting_docs", label: "Awaiting Docs", description: "Waiting for client to upload required documents", color: "bg-amber-100 text-amber-800" },
  { status: "docs_validated", label: "Docs Validated", description: "All documents received and verified", color: "bg-blue-100 text-blue-800" },
  { status: "classification_review", label: "Classification Review", description: "AI suggested HTS codes, broker review needed", color: "bg-sky-100 text-sky-800" },
  { status: "entry_prep", label: "Entry Prep", description: "Preparing the customs entry filing", color: "bg-indigo-100 text-indigo-800" },
  { status: "submitted", label: "Submitted", description: "Entry filed with CBP", color: "bg-violet-100 text-violet-800" },
  { status: "govt_review", label: "Govt Review", description: "CBP is reviewing the entry", color: "bg-purple-100 text-purple-800" },
  { status: "hold", label: "Hold", description: "Government hold \u2014 action required", color: "bg-red-100 text-red-800" },
  { status: "released", label: "Released", description: "Shipment cleared by customs", color: "bg-emerald-100 text-emerald-800" },
  { status: "billing", label: "Billing", description: "Ready for invoicing", color: "bg-teal-100 text-teal-800" },
  { status: "closed", label: "Closed", description: "Case complete", color: "bg-slate-100 text-slate-700" },
  { status: "archived", label: "Archived", description: "Historical record", color: "bg-gray-100 text-gray-600" },
] as const;

export function StatusGuide() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
      >
        <HelpCircle className="h-4 w-4 text-slate-400" />
        <span>Status Guide</span>
        {open ? (
          <ChevronUp className="ml-auto h-4 w-4 text-slate-400" />
        ) : (
          <ChevronDown className="ml-auto h-4 w-4 text-slate-400" />
        )}
      </button>

      {open && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {STATUS_DEFINITIONS.map((item) => (
              <div
                key={item.status}
                className="flex items-start gap-2.5 rounded-lg bg-slate-50 px-3 py-2.5"
              >
                <Badge
                  variant="secondary"
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${item.color}`}
                >
                  {item.label}
                </Badge>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
