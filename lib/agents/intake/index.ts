import { registerAgent } from '@/lib/agents/registry';
import { callClaude } from '@/lib/agents/llm';
import { createServiceClient } from '@/lib/supabase/server';
import type { AgentInput, AgentContext, AgentOutput } from '@/lib/types/agents';

const SYSTEM_PROMPT = `You are the Intake Agent for BizOS, a customs brokerage operating system.

Your job is to process inbound emails and extract structured case information for customs brokerage entries.

Given an email (from, subject, body), you must:
1. Identify the client from sender address, company name, or email content
2. Extract shipment details: reference numbers, mode of transport, ETA, commodity descriptions
3. Detect urgency indicators (e.g., "urgent", "rush", "perishable", "time-sensitive")
4. Identify what documents are mentioned or attached
5. Note any special instructions

RULES:
- If information is ambiguous, flag it as uncertain rather than guessing
- Set confidence scores honestly (0-1)
- For missing critical fields, suggest specific questions to ask the client
- Never invent reference numbers or dates not present in the email

Respond with valid JSON matching this schema:
{
  "client_match": {
    "matched": true/false,
    "client_name": "...",
    "match_confidence": 0.0-1.0,
    "match_reason": "..."
  },
  "extracted_case": {
    "mode_of_transport": "ocean" | "air" | "truck" | "rail" | null,
    "priority": "low" | "normal" | "high" | "urgent",
    "eta": "YYYY-MM-DD" or null,
    "reference_numbers": ["..."],
    "commodity_description": "...",
    "special_instructions": "...",
    "notes": "..."
  },
  "extracted_fields": [
    { "field": "...", "value": "...", "confidence": 0.0-1.0, "evidence": "quoted text" }
  ],
  "missing_fields": [
    { "field": "...", "why_needed": "...", "suggested_question": "..." }
  ],
  "risk_flags": ["..."],
  "suggested_tasks": [
    { "title": "...", "assignee_role": "...", "due_hours": 4, "priority": "normal" }
  ],
  "client_response_draft": {
    "subject": "Re: ...",
    "body": "..."
  },
  "overall_confidence": 0.0-1.0
}`;

async function handleIntake(input: AgentInput, context: AgentContext): Promise<AgentOutput> {
  const { from, to, subject, body, attachmentNames, clientAccountId } = input.data as {
    from: string;
    to?: string;
    subject: string;
    body: string;
    attachmentNames?: string[];
    clientAccountId?: string;
  };

  if (!from || !subject || !body) {
    return {
      success: false,
      result: {},
      confidence: 0,
      citations: [],
      error: 'Missing required email fields: from, subject, body',
    };
  }

  const supabase = createServiceClient();

  // Fetch existing clients for matching
  const { data: clients } = await supabase
    .from('client_accounts')
    .select('id, name, importer_of_record_number')
    .eq('tenant_id', context.tenantId)
    .eq('is_active', true);

  // Fetch contacts for email matching
  const { data: contacts } = await supabase
    .from('contacts')
    .select('name, email, client_account_id, client_account:client_accounts(name)')
    .eq('tenant_id', context.tenantId);

  // Check for potential duplicate cases
  const { data: recentCases } = await supabase
    .from('entry_cases')
    .select('id, case_number, status, eta, client_account:client_accounts(name), metadata')
    .eq('tenant_id', context.tenantId)
    .in('status', ['intake', 'awaiting_docs', 'docs_validated'])
    .order('created_at', { ascending: false })
    .limit(20);

  const userPrompt = buildIntakePrompt(
    from, to, subject, body,
    attachmentNames ?? [],
    clients ?? [],
    contacts ?? [],
    recentCases ?? [],
    clientAccountId
  );

  try {
    const llmResponse = await callClaude({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
      temperature: 0,
      maxTokens: 4096,
    });

    const parsed = JSON.parse(llmResponse.content);

    // Try to resolve client_account_id
    let resolvedClientId = clientAccountId;
    if (!resolvedClientId && parsed.client_match?.matched && clients) {
      const matchedClient = clients.find(
        (c) => c.name.toLowerCase() === parsed.client_match.client_name?.toLowerCase()
      );
      if (matchedClient) {
        resolvedClientId = matchedClient.id;
      }
    }

    // Check for duplicates
    const duplicateCandidates = findDuplicates(parsed, recentCases ?? []);

    const result = {
      draft_case: {
        client_id: resolvedClientId ?? null,
        client_name: parsed.client_match?.client_name ?? null,
        mode: parsed.extracted_case?.mode_of_transport ?? null,
        priority: parsed.extracted_case?.priority ?? 'normal',
        eta: parsed.extracted_case?.eta ?? null,
        notes: parsed.extracted_case?.notes ?? '',
        metadata: {
          reference_numbers: parsed.extracted_case?.reference_numbers ?? [],
          commodity_description: parsed.extracted_case?.commodity_description ?? '',
          special_instructions: parsed.extracted_case?.special_instructions ?? '',
          source_email: { from, subject, received_at: new Date().toISOString() },
        },
      },
      extracted_fields: parsed.extracted_fields ?? [],
      missing_fields: parsed.missing_fields ?? [],
      duplicate_candidates: duplicateCandidates,
      suggested_tasks: parsed.suggested_tasks ?? [],
      client_response_draft: parsed.client_response_draft ?? null,
      risk_flags: parsed.risk_flags ?? [],
      client_match: parsed.client_match ?? { matched: false },
    };

    return {
      success: true,
      result,
      confidence: parsed.overall_confidence ?? 0,
      citations: (parsed.extracted_fields ?? []).map((f: { field: string; evidence: string; confidence: number }) => ({
        source: f.field,
        text: f.evidence ?? '',
        confidence: f.confidence ?? 0,
      })),
      tokensUsed: llmResponse.usage,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      result: { error: errorMessage },
      confidence: 0,
      citations: [],
      error: errorMessage,
    };
  }
}

function buildIntakePrompt(
  from: string,
  to: string | undefined,
  subject: string,
  body: string,
  attachmentNames: string[],
  clients: { id: string; name: string; importer_of_record_number: string | null }[],
  contacts: { name: string; email: string | null; client_account_id: string; client_account: unknown }[],
  recentCases: { id: string; case_number: string; status: string; eta: string | null; client_account: unknown; metadata: unknown }[],
  preselectedClientId?: string
): string {
  let prompt = `Process this inbound email for customs case intake.\n\n`;
  prompt += `--- EMAIL ---\nFrom: ${from}\n`;
  if (to) prompt += `To: ${to}\n`;
  prompt += `Subject: ${subject}\n\n${body}\n--- END EMAIL ---\n\n`;

  if (attachmentNames.length > 0) {
    prompt += `Attachments: ${attachmentNames.join(', ')}\n\n`;
  }

  prompt += `Known clients:\n`;
  for (const c of clients) {
    prompt += `- ${c.name}${c.importer_of_record_number ? ` (IOR: ${c.importer_of_record_number})` : ''}\n`;
  }

  prompt += `\nKnown contacts:\n`;
  for (const c of contacts) {
    const clientName = (c.client_account as { name: string } | null)?.name ?? 'Unknown';
    prompt += `- ${c.name} <${c.email ?? 'no email'}> → ${clientName}\n`;
  }

  if (preselectedClientId) {
    const client = clients.find((c) => c.id === preselectedClientId);
    if (client) {
      prompt += `\nPre-selected client: ${client.name}\n`;
    }
  }

  if (recentCases.length > 0) {
    prompt += `\nRecent open cases (check for duplicates):\n`;
    for (const c of recentCases) {
      const clientName = (c.client_account as { name: string } | null)?.name ?? 'Unknown';
      prompt += `- ${c.case_number} | ${clientName} | ${c.status} | ETA: ${c.eta ?? 'N/A'}\n`;
    }
  }

  return prompt;
}

function findDuplicates(
  parsed: { extracted_case?: { reference_numbers?: string[]; eta?: string } },
  recentCases: { id: string; case_number: string; eta: string | null; metadata: unknown }[]
): { case_id: string; case_number: string; similarity_reason: string }[] {
  const candidates: { case_id: string; case_number: string; similarity_reason: string }[] = [];
  const refs = parsed.extracted_case?.reference_numbers ?? [];

  for (const rc of recentCases) {
    const meta = rc.metadata as { reference_numbers?: string[] } | null;
    const caseRefs = meta?.reference_numbers ?? [];

    // Check reference number overlap
    const overlap = refs.filter((r) => caseRefs.includes(r));
    if (overlap.length > 0) {
      candidates.push({
        case_id: rc.id,
        case_number: rc.case_number,
        similarity_reason: `Matching reference numbers: ${overlap.join(', ')}`,
      });
      continue;
    }

    // Check same ETA
    if (parsed.extracted_case?.eta && rc.eta) {
      const parsedDate = parsed.extracted_case.eta.slice(0, 10);
      const caseDate = rc.eta.slice(0, 10);
      if (parsedDate === caseDate) {
        candidates.push({
          case_id: rc.id,
          case_number: rc.case_number,
          similarity_reason: `Same ETA: ${parsedDate}`,
        });
      }
    }
  }

  return candidates;
}

export function registerIntakeAgent(): void {
  registerAgent({
    id: 'intake-agent',
    name: 'Intake Agent',
    description: 'Processes inbound emails and creates draft cases with extracted shipment details.',
    type: 'intake',
    autonomyLevel: 'L0',
    tools: ['match_client', 'detect_duplicates', 'create_draft'],
    confidenceThreshold: 0.7,
    handler: handleIntake,
  });
}
