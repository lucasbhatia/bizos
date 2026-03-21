/**
 * EDI Bridge — Provider Integration Stub
 *
 * This module provides a stub implementation for submitting customs filings
 * to an EDI provider (e.g., ACE/ABI direct connect or a third-party service).
 *
 * In production, replace the stub implementations with actual API calls to your
 * chosen EDI provider. You will need:
 *   - Provider API credentials (API key, client ID, etc.)
 *   - Endpoint URLs for submission, status checks, and history
 *   - Proper EDI message formatting (ANSI X12, EDIFACT, etc.)
 *
 * All functions return simulated responses for development and testing.
 */

// ============================================================================
// Type definitions
// ============================================================================

export interface FilingLineItem {
  htsCode: string;
  description: string;
  quantity: number;
  value: number;
  countryOfOrigin: string;
  dutyRate: string;
}

export interface FilingSubmission {
  caseId: string;
  caseNumber: string;
  importerOfRecord: string;
  transportMode: string;
  eta: string | null;
  portOfEntry: string | null;
  lineItems: FilingLineItem[];
  documents: { docType: string; fileName: string }[];
  submittedBy: string;
  submittedAt: string;
}

export type FilingStatus =
  | "pending"
  | "transmitted"
  | "accepted"
  | "rejected"
  | "under_review"
  | "error";

export interface FilingResponse {
  filingId: string;
  status: FilingStatus;
  provider: string;
  referenceNumber: string | null;
  message: string;
  submittedAt: string;
  estimatedProcessingTime: string;
}

export interface FilingStatusResponse {
  filingId: string;
  status: FilingStatus;
  lastUpdated: string;
  message: string;
  cbpReferenceNumber: string | null;
  errors: { code: string; description: string }[];
}

export interface FilingHistoryEntry {
  filingId: string;
  caseId: string;
  status: FilingStatus;
  provider: string;
  submittedAt: string;
  lastUpdated: string;
  referenceNumber: string | null;
}

// ============================================================================
// Stub implementations
// ============================================================================

const PROVIDER_NAME = "BizOS EDI Bridge (Stub)";

/**
 * Submit a filing packet to the EDI provider.
 * STUB: Simulates a successful submission with a generated filing ID.
 */
export async function submitFiling(
  submission: FilingSubmission
): Promise<FilingResponse> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  const filingId = `FIL-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  return {
    filingId,
    status: "pending",
    provider: PROVIDER_NAME,
    referenceNumber: null,
    message: `Filing ${filingId} submitted successfully. Awaiting CBP processing.`,
    submittedAt: submission.submittedAt,
    estimatedProcessingTime: "2-4 hours",
  };
}

/**
 * Check the status of a previously submitted filing.
 * STUB: Returns a mock status based on how recently the filing was submitted.
 */
export async function checkFilingStatus(
  filingId: string
): Promise<FilingStatusResponse> {
  await new Promise((resolve) => setTimeout(resolve, 300));

  // Simulate different statuses based on filing ID hash
  const hash = filingId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const statusOptions: FilingStatus[] = [
    "pending",
    "transmitted",
    "accepted",
    "under_review",
  ];
  const simulatedStatus = statusOptions[hash % statusOptions.length];

  return {
    filingId,
    status: simulatedStatus,
    lastUpdated: new Date().toISOString(),
    message: `Filing is currently ${simulatedStatus.replace(/_/g, " ")}`,
    cbpReferenceNumber:
      simulatedStatus === "accepted"
        ? `CBP-${Date.now().toString().slice(-8)}`
        : null,
    errors: [],
  };
}

/**
 * Get the filing history for a specific case.
 * STUB: Returns entries from case metadata (passed in from the caller).
 */
export async function getFilingHistory(
  history: {
    filing_id: string;
    case_id: string;
    status: string;
    provider: string;
    submitted_at: string;
    last_updated: string;
    reference_number: string | null;
  }[]
): Promise<FilingHistoryEntry[]> {
  return history.map((h) => ({
    filingId: h.filing_id,
    caseId: h.case_id,
    status: h.status as FilingStatus,
    provider: h.provider,
    submittedAt: h.submitted_at,
    lastUpdated: h.last_updated,
    referenceNumber: h.reference_number,
  }));
}
