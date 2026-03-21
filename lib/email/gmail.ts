import { google, gmail_v1 } from 'googleapis';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const oauthTokensSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  scope: z.string().optional(),
  token_type: z.string().optional(),
  expiry_date: z.number().optional(),
});

export type OAuthTokens = z.infer<typeof oauthTokensSchema>;

const parsedEmailSchema = z.object({
  from: z.string(),
  to: z.string(),
  subject: z.string(),
  body: z.string(),
  attachmentNames: z.array(z.string()),
  receivedAt: z.string(),
  messageId: z.string(),
});

export type ParsedEmail = z.infer<typeof parsedEmailSchema>;

const emailSettingsSchema = z.object({
  gmail_tokens: oauthTokensSchema.optional(),
  processed_message_ids: z.array(z.string()).optional(),
  last_sync_at: z.string().optional(),
});

export type EmailSettings = z.infer<typeof emailSettingsSchema>;

// ---------------------------------------------------------------------------
// OAuth2 helpers
// ---------------------------------------------------------------------------

function getOAuth2Client() {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const redirectUri = process.env.GMAIL_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      'Missing Gmail OAuth environment variables: GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REDIRECT_URI'
    );
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
] as const;

export function getAuthUrl(state: string): string {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [...SCOPES],
    prompt: 'consent',
    state,
  });
}

export async function getTokensFromCode(code: string): Promise<OAuthTokens> {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);

  const parsed = oauthTokensSchema.safeParse(tokens);
  if (!parsed.success) {
    throw new Error(`Invalid token response from Google: ${parsed.error.message}`);
  }

  return parsed.data;
}

export function getGmailClient(tokens: OAuthTokens): gmail_v1.Gmail {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials(tokens);
  return google.gmail({ version: 'v1', auth: oauth2Client });
}

// ---------------------------------------------------------------------------
// Gmail API wrappers
// ---------------------------------------------------------------------------

export async function listMessages(
  client: gmail_v1.Gmail,
  query: string,
  maxResults: number = 20
): Promise<gmail_v1.Schema$Message[]> {
  const res = await client.users.messages.list({
    userId: 'me',
    q: query,
    maxResults,
  });

  return res.data.messages ?? [];
}

export async function getMessage(
  client: gmail_v1.Gmail,
  messageId: string
): Promise<gmail_v1.Schema$Message> {
  const res = await client.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  });

  return res.data;
}

// ---------------------------------------------------------------------------
// Email parsing
// ---------------------------------------------------------------------------

function getHeader(
  headers: gmail_v1.Schema$MessagePartHeader[] | undefined,
  name: string
): string {
  if (!headers) return '';
  const header = headers.find(
    (h) => h.name?.toLowerCase() === name.toLowerCase()
  );
  return header?.value ?? '';
}

function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf-8');
}

function extractBody(payload: gmail_v1.Schema$MessagePart | undefined): string {
  if (!payload) return '';

  // Simple body
  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  // Multipart — look for text/plain first, then text/html
  if (payload.parts) {
    const plainPart = payload.parts.find(
      (p) => p.mimeType === 'text/plain'
    );
    if (plainPart?.body?.data) {
      return decodeBase64Url(plainPart.body.data);
    }

    const htmlPart = payload.parts.find(
      (p) => p.mimeType === 'text/html'
    );
    if (htmlPart?.body?.data) {
      // Strip HTML tags for a rough plaintext conversion
      const html = decodeBase64Url(htmlPart.body.data);
      return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }

    // Recurse into nested multipart
    for (const part of payload.parts) {
      const nested = extractBody(part);
      if (nested) return nested;
    }
  }

  return '';
}

function extractAttachmentNames(
  payload: gmail_v1.Schema$MessagePart | undefined
): string[] {
  const names: string[] = [];
  if (!payload) return names;

  if (payload.filename && payload.filename.length > 0) {
    names.push(payload.filename);
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      names.push(...extractAttachmentNames(part));
    }
  }

  return names;
}

export function parseEmailMessage(message: gmail_v1.Schema$Message): ParsedEmail {
  const headers = message.payload?.headers;
  const from = getHeader(headers, 'From');
  const to = getHeader(headers, 'To');
  const subject = getHeader(headers, 'Subject');
  const body = extractBody(message.payload);
  const attachmentNames = extractAttachmentNames(message.payload);

  // Convert internalDate (epoch ms) to ISO string
  const internalDate = message.internalDate
    ? new Date(Number(message.internalDate)).toISOString()
    : new Date().toISOString();

  return {
    from,
    to,
    subject,
    body,
    attachmentNames,
    receivedAt: internalDate,
    messageId: message.id ?? '',
  };
}

// ---------------------------------------------------------------------------
// Token persistence (via tenants.settings JSONB)
// ---------------------------------------------------------------------------

export async function storeTokens(
  tenantId: string,
  tokens: OAuthTokens
): Promise<void> {
  const supabase = createServiceClient();

  const { data: tenant, error: fetchErr } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  if (fetchErr || !tenant) {
    throw new Error(`Failed to fetch tenant: ${fetchErr?.message ?? 'not found'}`);
  }

  const settings = (tenant.settings ?? {}) as Record<string, unknown>;
  settings.gmail_tokens = tokens;

  const { error: updateErr } = await supabase
    .from('tenants')
    .update({ settings })
    .eq('id', tenantId);

  if (updateErr) {
    throw new Error(`Failed to store Gmail tokens: ${updateErr.message}`);
  }
}

export async function getStoredTokens(
  tenantId: string
): Promise<OAuthTokens | null> {
  const supabase = createServiceClient();

  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  if (error || !tenant) return null;

  const settings = tenant.settings as Record<string, unknown> | null;
  if (!settings?.gmail_tokens) return null;

  const parsed = oauthTokensSchema.safeParse(settings.gmail_tokens);
  return parsed.success ? parsed.data : null;
}

export async function clearTokens(tenantId: string): Promise<void> {
  const supabase = createServiceClient();

  const { data: tenant, error: fetchErr } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  if (fetchErr || !tenant) {
    throw new Error(`Failed to fetch tenant: ${fetchErr?.message ?? 'not found'}`);
  }

  const settings = (tenant.settings ?? {}) as Record<string, unknown>;
  delete settings.gmail_tokens;
  delete settings.processed_message_ids;
  delete settings.last_sync_at;

  const { error: updateErr } = await supabase
    .from('tenants')
    .update({ settings })
    .eq('id', tenantId);

  if (updateErr) {
    throw new Error(`Failed to clear Gmail tokens: ${updateErr.message}`);
  }
}

// ---------------------------------------------------------------------------
// Processed-message tracking
// ---------------------------------------------------------------------------

export async function getProcessedMessageIds(
  tenantId: string
): Promise<Set<string>> {
  const supabase = createServiceClient();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  const settings = (tenant?.settings ?? {}) as Record<string, unknown>;
  const ids = Array.isArray(settings.processed_message_ids)
    ? (settings.processed_message_ids as string[])
    : [];

  return new Set(ids);
}

export async function markMessagesProcessed(
  tenantId: string,
  messageIds: string[]
): Promise<void> {
  const supabase = createServiceClient();

  const { data: tenant, error: fetchErr } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  if (fetchErr || !tenant) {
    throw new Error(`Failed to fetch tenant: ${fetchErr?.message ?? 'not found'}`);
  }

  const settings = (tenant.settings ?? {}) as Record<string, unknown>;
  const existing = Array.isArray(settings.processed_message_ids)
    ? (settings.processed_message_ids as string[])
    : [];

  const uniqueSet = new Set([...existing, ...messageIds]);
  const merged = Array.from(uniqueSet);

  // Keep only the last 1000 processed IDs to avoid unbounded growth
  const trimmed = merged.slice(-1000);

  settings.processed_message_ids = trimmed;
  settings.last_sync_at = new Date().toISOString();

  const { error: updateErr } = await supabase
    .from('tenants')
    .update({ settings })
    .eq('id', tenantId);

  if (updateErr) {
    throw new Error(`Failed to update processed message IDs: ${updateErr.message}`);
  }
}

export async function getEmailSettings(
  tenantId: string
): Promise<EmailSettings> {
  const supabase = createServiceClient();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  const settings = (tenant?.settings ?? {}) as Record<string, unknown>;

  return {
    gmail_tokens: settings.gmail_tokens
      ? oauthTokensSchema.parse(settings.gmail_tokens)
      : undefined,
    processed_message_ids: Array.isArray(settings.processed_message_ids)
      ? (settings.processed_message_ids as string[])
      : undefined,
    last_sync_at: typeof settings.last_sync_at === 'string'
      ? settings.last_sync_at
      : undefined,
  };
}
