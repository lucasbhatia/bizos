import { z } from 'zod';
import { getStoredTokens, getGmailClient } from '@/lib/email/gmail';
import type { gmail_v1 } from 'googleapis';

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const sendEmailOptionsSchema = z.object({
  replyToMessageId: z.string().optional(),
  cc: z.string().optional(),
  bcc: z.string().optional(),
});

export type SendEmailOptions = z.infer<typeof sendEmailOptionsSchema>;

const sendEmailResultSchema = z.object({
  success: z.boolean(),
  messageId: z.string().optional(),
  error: z.string().optional(),
});

export type SendEmailResult = z.infer<typeof sendEmailResultSchema>;

// ---------------------------------------------------------------------------
// RFC 2822 message builder
// ---------------------------------------------------------------------------

function buildRawMessage(
  to: string,
  subject: string,
  body: string,
  options?: SendEmailOptions,
  threadId?: string
): { raw: string; threadId?: string } {
  const headers: string[] = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'MIME-Version: 1.0',
  ];

  if (options?.cc) {
    headers.push(`Cc: ${options.cc}`);
  }

  if (options?.bcc) {
    headers.push(`Bcc: ${options.bcc}`);
  }

  if (options?.replyToMessageId) {
    headers.push(`In-Reply-To: ${options.replyToMessageId}`);
    headers.push(`References: ${options.replyToMessageId}`);
  }

  const message = `${headers.join('\r\n')}\r\n\r\n${body}`;

  // Gmail API expects URL-safe base64 encoding
  const encoded = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return {
    raw: encoded,
    threadId: threadId ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Send email via Gmail API
// ---------------------------------------------------------------------------

export async function sendEmail(
  tenantId: string,
  to: string,
  subject: string,
  body: string,
  options?: SendEmailOptions
): Promise<SendEmailResult> {
  // 1. Get Gmail tokens for tenant
  const tokens = await getStoredTokens(tenantId);
  if (!tokens) {
    return {
      success: false,
      error: 'Gmail not connected. Please connect Gmail in Settings first.',
    };
  }

  // 2. Build Gmail client
  const gmailClient: gmail_v1.Gmail = getGmailClient(tokens);

  // 3. Construct message
  const { raw } = buildRawMessage(to, subject, body, options);

  // 4. Send via Gmail API
  try {
    const res = await gmailClient.users.messages.send({
      userId: 'me',
      requestBody: { raw },
    });

    const messageId = res.data.id ?? undefined;

    return {
      success: true,
      messageId,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Failed to send email: ${errorMessage}`,
    };
  }
}
