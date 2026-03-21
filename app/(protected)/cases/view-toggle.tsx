"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, List } from "lucide-react";

export function ViewToggle({ currentView }: { currentView: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setView(view: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (view === "table") {
      params.delete("view");
    } else {
      params.set("view", view);
    }
    router.push(`/cases?${params.toString()}`);
  }

  return (
    <div className="inline-flex rounded-lg border bg-white p-0.5">
      <button
        type="button"
        onClick={() => setView("table")}
        className={`inline-flex items-center justify-center rounded-md px-2.5 py-1.5 transition-colors ${
          currentView === "table"
            ? "bg-slate-900 text-white shadow-sm"
            : "text-slate-500 hover:text-slate-700"
        }`}
        title="Table view"
      >
        <List className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => setView("kanban")}
        className={`inline-flex items-center justify-center rounded-md px-2.5 py-1.5 transition-colors ${
          currentView === "kanban"
            ? "bg-slate-900 text-white shadow-sm"
            : "text-slate-500 hover:text-slate-700"
        }`}
        title="Kanban view"
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
    </div>
  );
}
