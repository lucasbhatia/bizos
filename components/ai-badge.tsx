"use client";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Bot, Check, X, Clock } from "lucide-react";
import type { HumanDecision } from "@/lib/types/database";

// ============================================================================
// Confidence Display
// ============================================================================

type ConfidenceLevel = "high" | "medium" | "low";

function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score > 0.85) return "high";
  if (score >= 0.7) return "medium";
  return "low";
}

const CONFIDENCE_CONFIG: Record<
  ConfidenceLevel,
  { label: string; color: string; iconClass: string }
> = {
  high: {
    label: "High confidence",
    color: "text-green-600",
    iconClass: "bg-green-500",
  },
  medium: {
    label: "Needs review",
    color: "text-yellow-600",
    iconClass: "bg-yellow-500",
  },
  low: {
    label: "Low confidence \u2014 verify",
    color: "text-red-600",
    iconClass: "bg-red-500",
  },
};

export function ConfidenceDisplay({
  score,
  className,
}: {
  score: number;
  className?: string;
}) {
  const level = getConfidenceLevel(score);
  const config = CONFIDENCE_CONFIG[level];
  const pct = Math.round(score * 100);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-xs font-medium",
              config.color,
              className
            )}
          >
            {/* Circle indicator */}
            <span className="relative flex h-3.5 w-3.5 items-center justify-center">
              {level === "high" ? (
                <span
                  className={cn("h-3 w-3 rounded-full", config.iconClass)}
                />
              ) : level === "medium" ? (
                /* Half-filled circle */
                <span className="relative h-3 w-3 overflow-hidden rounded-full border-2 border-yellow-500">
                  <span className="absolute inset-0 w-1/2 bg-yellow-500" />
                </span>
              ) : (
                /* Outline circle */
                <span className="h-3 w-3 rounded-full border-2 border-red-500" />
              )}
            </span>
            {config.label}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Confidence: {pct}%</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================================================
// AI Action Badge
// ============================================================================

export function AiBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700",
        className
      )}
    >
      <Bot className="h-3 w-3" />
      AI
    </span>
  );
}

// ============================================================================
// Human Review Status
// ============================================================================

const REVIEW_CONFIG: Record<
  Exclude<HumanDecision, "modified">,
  {
    icon: React.ElementType;
    label: string;
    className: string;
  }
> = {
  accepted: {
    icon: Check,
    label: "Verified",
    className: "text-green-700 bg-green-50",
  },
  rejected: {
    icon: X,
    label: "Rejected",
    className: "text-red-700 bg-red-50",
  },
  pending: {
    icon: Clock,
    label: "Awaiting review",
    className: "text-yellow-700 bg-yellow-50",
  },
};

export function HumanReviewStatus({
  decision,
  reviewerName,
  className,
}: {
  decision: HumanDecision;
  reviewerName?: string | null;
  className?: string;
}) {
  // Treat "modified" same as "accepted" for display
  const key = decision === "modified" ? "accepted" : decision;
  const config = REVIEW_CONFIG[key];
  const Icon = config.icon;

  const displayLabel =
    decision === "accepted" || decision === "modified"
      ? reviewerName
        ? `Verified by ${reviewerName}`
        : "Verified"
      : config.label;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {displayLabel}
    </span>
  );
}
