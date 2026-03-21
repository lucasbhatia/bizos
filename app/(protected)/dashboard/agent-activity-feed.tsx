"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bot, ChevronDown, ChevronUp } from "lucide-react";

interface AiAction {
  id: string;
  agent_type: string;
  action: string;
  confidence: number | null;
  created_at: string;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffHours / 24);
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMinutes > 0) return `${diffMinutes}m ago`;
  return "just now";
}

function formatAgentName(agentType: string): string {
  return agentType
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function getConfidenceBadge(confidence: number | null) {
  if (confidence === null) return null;
  const pct = Math.round(confidence * 100);
  let color = "bg-green-100 text-green-800";
  if (confidence < 0.7) color = "bg-red-100 text-red-800";
  else if (confidence < 0.85) color = "bg-yellow-100 text-yellow-800";
  return (
    <Badge variant="secondary" className={`text-xs ${color}`}>
      {pct}%
    </Badge>
  );
}

export function AgentActivityFeed({ actions }: { actions: AiAction[] }) {
  const [isOpen, setIsOpen] = useState(false);

  if (actions.length === 0) return null;

  return (
    <div className="rounded-xl bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-slate-50/50 rounded-xl transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
            <Bot className="h-4 w-4 text-blue-600" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">
            Agent Activity
          </h2>
          <Badge variant="outline" className="text-xs">
            {actions.length}
          </Badge>
        </div>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-slate-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-slate-400" />
        )}
      </button>

      {isOpen && (
        <div className="border-t px-6 pb-4">
          <div className="divide-y">
            {actions.map((action) => (
              <div
                key={action.id}
                className="flex items-start gap-3 py-3"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 mt-0.5">
                  <Bot className="h-3.5 w-3.5 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-slate-900">
                      {formatAgentName(action.agent_type)}
                    </span>
                    {getConfidenceBadge(action.confidence)}
                  </div>
                  <p className="text-sm text-slate-600 mt-0.5">
                    {action.action}
                  </p>
                </div>
                <span className="text-xs text-slate-400 shrink-0 mt-1">
                  {formatRelativeTime(action.created_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
