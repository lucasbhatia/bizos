// Design tokens for BizOS — Customs Brokerage Operating System
// Central source of truth for colors, status mappings, and utility functions.

import type { CaseStatus, PriorityLevel } from "@/lib/types/database";

// ============================================================================
// Color palette constants
// ============================================================================

export const PALETTE = {
  // Primary
  navy: "#0F172A",
  navyLight: "#1E293B",
  navyMuted: "#334155",

  // Accent
  blue: "#2563EB",
  blueLighter: "#3B82F6",
  bluePale: "#DBEAFE",

  // Teal
  teal: "#0D9488",
  tealLighter: "#14B8A6",
  tealPale: "#CCFBF1",

  // Neutrals
  white: "#FFFFFF",
  gray50: "#F8FAFC",
  gray100: "#F1F5F9",
  gray200: "#E2E8F0",
  gray300: "#CBD5E1",
  gray400: "#94A3B8",
  gray500: "#64748B",
  gray600: "#475569",
  gray700: "#334155",
  gray800: "#1E293B",
  gray900: "#0F172A",

  // Semantic
  red: "#DC2626",
  redPale: "#FEE2E2",
  orange: "#EA580C",
  orangePale: "#FED7AA",
  amber: "#D97706",
  amberPale: "#FEF3C7",
  green: "#16A34A",
  greenPale: "#DCFCE7",
  purple: "#7C3AED",
  purplePale: "#EDE9FE",
  yellow: "#CA8A04",
  yellowPale: "#FEF9C3",
} as const;

// ============================================================================
// Color token shape returned by all utility functions
// ============================================================================

export interface ColorToken {
  bg: string;
  text: string;
  border: string;
  dot: string;
}

// ============================================================================
// Status colors — maps CaseStatus to Tailwind classes
// ============================================================================

export const STATUS_COLOR_MAP: Record<CaseStatus, ColorToken> = {
  intake: {
    bg: "bg-amber-100",
    text: "text-amber-800",
    border: "border-amber-300",
    dot: "bg-amber-500",
  },
  awaiting_docs: {
    bg: "bg-amber-100",
    text: "text-amber-800",
    border: "border-amber-300",
    dot: "bg-amber-500",
  },
  docs_validated: {
    bg: "bg-blue-100",
    text: "text-blue-800",
    border: "border-blue-300",
    dot: "bg-blue-500",
  },
  classification_review: {
    bg: "bg-blue-100",
    text: "text-blue-800",
    border: "border-blue-300",
    dot: "bg-blue-500",
  },
  entry_prep: {
    bg: "bg-blue-100",
    text: "text-blue-800",
    border: "border-blue-300",
    dot: "bg-blue-500",
  },
  submitted: {
    bg: "bg-purple-100",
    text: "text-purple-800",
    border: "border-purple-300",
    dot: "bg-purple-500",
  },
  govt_review: {
    bg: "bg-purple-100",
    text: "text-purple-800",
    border: "border-purple-300",
    dot: "bg-purple-500",
  },
  hold: {
    bg: "bg-red-100",
    text: "text-red-800",
    border: "border-red-300",
    dot: "bg-red-500",
  },
  released: {
    bg: "bg-green-100",
    text: "text-green-800",
    border: "border-green-300",
    dot: "bg-green-500",
  },
  billing: {
    bg: "bg-green-100",
    text: "text-green-800",
    border: "border-green-300",
    dot: "bg-green-500",
  },
  closed: {
    bg: "bg-gray-100",
    text: "text-gray-800",
    border: "border-gray-300",
    dot: "bg-gray-500",
  },
  archived: {
    bg: "bg-gray-100",
    text: "text-gray-800",
    border: "border-gray-300",
    dot: "bg-gray-400",
  },
};

// ============================================================================
// Priority colors
// ============================================================================

export const PRIORITY_COLOR_MAP: Record<PriorityLevel, ColorToken> = {
  urgent: {
    bg: "bg-red-100",
    text: "text-red-800",
    border: "border-red-300",
    dot: "bg-red-500",
  },
  high: {
    bg: "bg-orange-100",
    text: "text-orange-800",
    border: "border-orange-300",
    dot: "bg-orange-500",
  },
  normal: {
    bg: "bg-blue-100",
    text: "text-blue-800",
    border: "border-blue-300",
    dot: "bg-blue-500",
  },
  low: {
    bg: "bg-gray-100",
    text: "text-gray-800",
    border: "border-gray-300",
    dot: "bg-gray-400",
  },
};

// ============================================================================
// Confidence thresholds
// ============================================================================

const CONFIDENCE_HIGH: ColorToken = {
  bg: "bg-green-100",
  text: "text-green-800",
  border: "border-green-300",
  dot: "bg-green-500",
};

const CONFIDENCE_MEDIUM: ColorToken = {
  bg: "bg-yellow-100",
  text: "text-yellow-800",
  border: "border-yellow-300",
  dot: "bg-yellow-500",
};

const CONFIDENCE_LOW: ColorToken = {
  bg: "bg-red-100",
  text: "text-red-800",
  border: "border-red-300",
  dot: "bg-red-500",
};

// ============================================================================
// Risk thresholds
// ============================================================================

const RISK_LOW: ColorToken = {
  bg: "bg-green-100",
  text: "text-green-800",
  border: "border-green-300",
  dot: "bg-green-500",
};

const RISK_MEDIUM: ColorToken = {
  bg: "bg-yellow-100",
  text: "text-yellow-800",
  border: "border-yellow-300",
  dot: "bg-yellow-500",
};

const RISK_HIGH: ColorToken = {
  bg: "bg-orange-100",
  text: "text-orange-800",
  border: "border-orange-300",
  dot: "bg-orange-500",
};

const RISK_CRITICAL: ColorToken = {
  bg: "bg-red-100",
  text: "text-red-800",
  border: "border-red-300",
  dot: "bg-red-500",
};

// ============================================================================
// Utility functions
// ============================================================================

/** Returns `{ bg, text, border, dot }` CSS classes for a case status. */
export function getStatusColor(status: CaseStatus): ColorToken {
  return STATUS_COLOR_MAP[status];
}

/** Returns `{ bg, text, border, dot }` CSS classes for a priority level. */
export function getPriorityColor(priority: PriorityLevel): ColorToken {
  return PRIORITY_COLOR_MAP[priority];
}

/**
 * Returns `{ bg, text, border, dot }` CSS classes for a confidence score.
 * - high  : > 0.85
 * - medium: 0.7 – 0.85
 * - low   : < 0.7
 */
export function getConfidenceColor(confidence: number): ColorToken {
  if (confidence > 0.85) return CONFIDENCE_HIGH;
  if (confidence >= 0.7) return CONFIDENCE_MEDIUM;
  return CONFIDENCE_LOW;
}

/**
 * Returns `{ bg, text, border, dot }` CSS classes for a risk score (0-100).
 * - low     : 0 – 25
 * - medium  : 26 – 50
 * - high    : 51 – 75
 * - critical: 76 – 100
 */
export function getRiskColor(riskScore: number): ColorToken {
  if (riskScore <= 25) return RISK_LOW;
  if (riskScore <= 50) return RISK_MEDIUM;
  if (riskScore <= 75) return RISK_HIGH;
  return RISK_CRITICAL;
}
