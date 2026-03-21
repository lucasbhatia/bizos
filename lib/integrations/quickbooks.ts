/**
 * QuickBooks Online (QBO) Integration Client
 *
 * This is a stub implementation. To make it functional:
 * 1. Register an app at https://developer.intuit.com
 * 2. Set the following environment variables:
 *    - QBO_CLIENT_ID: Your OAuth2 client ID
 *    - QBO_CLIENT_SECRET: Your OAuth2 client secret
 *    - QBO_REDIRECT_URI: OAuth2 callback URL (e.g. https://yourapp.com/api/integrations/quickbooks/callback)
 *    - QBO_ENVIRONMENT: 'sandbox' or 'production'
 *    - QBO_COMPANY_ID: Your QuickBooks company ID (set after OAuth)
 *
 * All methods return mock responses until real credentials are configured.
 */

export interface QBOTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  realm_id: string;
}

export interface QBOInvoiceResponse {
  id: string;
  sync_token: string;
  doc_number: string;
  total_amount: number;
  balance: number;
  status: "Paid" | "Open" | "Overdue" | "Voided";
}

export interface QBOPaymentStatus {
  invoice_id: string;
  is_paid: boolean;
  balance_remaining: number;
  last_payment_date: string | null;
}

const QBO_AUTH_BASE = "https://appcenter.intuit.com/connect/oauth2";
const QBO_API_BASE_SANDBOX = "https://sandbox-quickbooks.api.intuit.com/v3";
const QBO_API_BASE_PRODUCTION = "https://quickbooks.api.intuit.com/v3";

function getApiBase(): string {
  const env = process.env.QBO_ENVIRONMENT ?? "sandbox";
  return env === "production" ? QBO_API_BASE_PRODUCTION : QBO_API_BASE_SANDBOX;
}

function isConfigured(): boolean {
  return !!(
    process.env.QBO_CLIENT_ID &&
    process.env.QBO_CLIENT_SECRET &&
    process.env.QBO_REDIRECT_URI
  );
}

/**
 * Generate the OAuth2 authorization URL for QuickBooks.
 * Redirect the user to this URL to begin the OAuth flow.
 */
export function getAuthUrl(state: string): string {
  if (!isConfigured()) {
    throw new Error(
      "QuickBooks is not configured. Set QBO_CLIENT_ID, QBO_CLIENT_SECRET, and QBO_REDIRECT_URI."
    );
  }

  const params = new URLSearchParams({
    client_id: process.env.QBO_CLIENT_ID!,
    redirect_uri: process.env.QBO_REDIRECT_URI!,
    response_type: "code",
    scope: "com.intuit.quickbooks.accounting",
    state,
  });

  return `${QBO_AUTH_BASE}?${params.toString()}`;
}

/**
 * Exchange the authorization code for access and refresh tokens.
 * STUB: Returns mock tokens.
 */
export async function getTokens(code: string): Promise<QBOTokens> {
  if (!isConfigured()) {
    // Return mock tokens for development
    return {
      access_token: `mock_access_${code}`,
      refresh_token: `mock_refresh_${code}`,
      expires_in: 3600,
      token_type: "bearer",
      realm_id: "mock_realm_123",
    };
  }

  // In production, this would POST to Intuit's token endpoint:
  // POST https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer
  // with grant_type=authorization_code, code, redirect_uri
  // using Basic auth (client_id:client_secret)

  void getApiBase(); // acknowledge usage

  return {
    access_token: `mock_access_${code}`,
    refresh_token: `mock_refresh_${code}`,
    expires_in: 3600,
    token_type: "bearer",
    realm_id: "mock_realm_123",
  };
}

/**
 * Refresh the access token using the refresh token.
 * STUB: Returns mock tokens.
 */
export async function refreshTokens(refreshToken: string): Promise<QBOTokens> {
  void refreshToken;
  return {
    access_token: `mock_access_refreshed_${Date.now()}`,
    refresh_token: `mock_refresh_refreshed_${Date.now()}`,
    expires_in: 3600,
    token_type: "bearer",
    realm_id: process.env.QBO_COMPANY_ID ?? "mock_realm_123",
  };
}

/**
 * Sync an invoice to QuickBooks Online.
 * STUB: Returns a mock QBO invoice response.
 *
 * In production, this would:
 * 1. Map the BizOS invoice to QBO Invoice format
 * 2. POST to /v3/company/{companyId}/invoice
 * 3. Store the QBO invoice ID back on the BizOS invoice
 */
export async function syncInvoice(invoice: {
  id: string;
  invoice_number: string;
  client_account_id: string;
  line_items: { description: string; quantity: number; unit_price: number; amount: number }[];
  subtotal: number;
  tax: number;
  total: number;
  due_date: string | null;
  notes: string | null;
}): Promise<QBOInvoiceResponse> {
  // Mock: simulate a brief delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  return {
    id: `qbo_inv_${invoice.id.slice(0, 8)}`,
    sync_token: "0",
    doc_number: invoice.invoice_number,
    total_amount: invoice.total,
    balance: invoice.total,
    status: "Open",
  };
}

/**
 * Get the payment status of a QBO invoice.
 * STUB: Returns mock payment status.
 */
export async function getPaymentStatus(
  qboInvoiceId: string
): Promise<QBOPaymentStatus> {
  void qboInvoiceId;
  return {
    invoice_id: qboInvoiceId,
    is_paid: false,
    balance_remaining: 0,
    last_payment_date: null,
  };
}
