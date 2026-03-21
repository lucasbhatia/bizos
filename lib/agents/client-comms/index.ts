import { registerAgent } from '@/lib/agents/registry';
import { callClaude } from '@/lib/agents/llm';
import { createServiceClient } from '@/lib/supabase/server';
import type { AgentInput, AgentContext, AgentOutput } from '@/lib/types/agents';

type CommEventType = 'missing_documents' | 'status_update' | 'hold_notification' | 'clearance_notification';

const SYSTEM_PROMPT = `You are the Client Communications Agent for BizOS, a customs brokerage operating system.

You draft professional emails to clients on behalf of the customs brokerage. Your emails must:
- Be professional, clear, and concise
- Reference the specific case number and relevant details
- Address the client contact by name
- Never include sensitive regulatory details or internal notes
- Include clear calls to action when needed
- Maintain a helpful, service-oriented tone

For each email type:
- missing_documents: Politely request specific missing documents, explain why they're needed
- status_update: Inform client of case progress (submitted to customs, released, etc.)
- hold_notification: Notify about government hold, explain next steps without alarming
- clearance_notification: Good news — shipment cleared, provide pickup/delivery info

Respond with valid JSON:
{
  "subject": "...",
  "body": "...",
  "tone": "professional" | "urgent" | "congratulatory",
  "confidence": 0.0-1.0
}`;

async function handleClientComms(input: AgentInput, context: AgentContext): Promise<AgentOutput> {
  const {
    caseId,
    eventType,
    additionalContext,
  } = input.data as {
    caseId?: string;
    eventType: CommEventType;
    additionalContext?: string;
  };

  const targetCaseId = caseId ?? context.caseId;

  if (!targetCaseId || !eventType) {
    return { success: false, result: {}, confidence: 0, citations: [], error: 'Missing caseId or eventType' };
  }

  const supabase = createServiceClient();

  // Fetch case with client and contact info
  const { data: entryCase } = await supabase
    .from('entry_cases')
    .select('*, client_account:client_accounts(id, name)')
    .eq('id', targetCaseId)
    .single();

  if (!entryCase) {
    return { success: false, result: {}, confidence: 0, citations: [], error: 'Case not found' };
  }

  const client = Array.isArray(entryCase.client_account) ? entryCase.client_account[0] : entryCase.client_account;
  const clientId = (client as { id: string } | null)?.id;

  // Fetch primary contact
  let contactName = 'Valued Client';
  let contactEmail = '';
  if (clientId) {
    const { data: contact } = await supabase
      .from('contacts')
      .select('name, email')
      .eq('client_account_id', clientId)
      .eq('is_primary', true)
      .limit(1)
      .single();

    if (contact) {
      contactName = contact.name;
      contactEmail = contact.email ?? '';
    }
  }

  // Fetch missing docs info if relevant
  let missingDocsInfo = '';
  if (eventType === 'missing_documents') {
    const { data: docs } = await supabase
      .from('documents')
      .select('doc_type')
      .eq('entry_case_id', targetCaseId);

    const uploadedTypes = new Set((docs ?? []).map((d) => d.doc_type));
    const requiredByMode: Record<string, string[]> = {
      ocean: ['commercial_invoice', 'packing_list', 'bill_of_lading', 'arrival_notice', 'poa'],
      air: ['commercial_invoice', 'packing_list', 'airway_bill', 'poa'],
      truck: ['commercial_invoice', 'packing_list', 'bill_of_lading', 'poa'],
      rail: ['commercial_invoice', 'packing_list', 'bill_of_lading', 'poa'],
    };
    const required = requiredByMode[entryCase.mode_of_transport as string] ?? [];
    const missing = required.filter((r) => !uploadedTypes.has(r));
    missingDocsInfo = missing.length > 0
      ? `Missing documents: ${missing.map((d) => d.replace(/_/g, ' ')).join(', ')}`
      : 'All required documents uploaded';
  }

  const userPrompt = buildCommsPrompt(
    eventType,
    entryCase,
    (client as { name: string } | null)?.name ?? 'Unknown Client',
    contactName,
    missingDocsInfo,
    additionalContext
  );

  try {
    const llmResponse = await callClaude({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
      temperature: 0.3, // Slightly more creative for emails
      maxTokens: 1024,
    });

    const parsed = JSON.parse(llmResponse.content);

    // Store draft in case metadata
    const metadata = (entryCase.metadata ?? {}) as Record<string, unknown>;
    const drafts = (metadata.comm_drafts ?? []) as Record<string, unknown>[];
    drafts.push({
      event_type: eventType,
      subject: parsed.subject,
      body: parsed.body,
      contact_name: contactName,
      contact_email: contactEmail,
      generated_at: new Date().toISOString(),
      status: 'draft',
    });
    metadata.comm_drafts = drafts;

    await supabase
      .from('entry_cases')
      .update({ metadata })
      .eq('id', targetCaseId);

    return {
      success: true,
      result: {
        subject: parsed.subject,
        body: parsed.body,
        tone: parsed.tone,
        contact_name: contactName,
        contact_email: contactEmail,
        event_type: eventType,
      },
      confidence: parsed.confidence ?? 0.85,
      citations: [],
      tokensUsed: llmResponse.usage,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, result: { error: errorMessage }, confidence: 0, citations: [], error: errorMessage };
  }
}

function buildCommsPrompt(
  eventType: CommEventType,
  entryCase: Record<string, unknown>,
  clientName: string,
  contactName: string,
  missingDocsInfo: string,
  additionalContext?: string
): string {
  let prompt = `Draft a "${eventType}" email for:\n\n`;
  prompt += `Case Number: ${entryCase.case_number}\n`;
  prompt += `Client: ${clientName}\n`;
  prompt += `Contact Name: ${contactName}\n`;
  prompt += `Mode of Transport: ${entryCase.mode_of_transport}\n`;
  prompt += `Current Status: ${entryCase.status}\n`;
  prompt += `Priority: ${entryCase.priority}\n`;
  if (entryCase.eta) prompt += `ETA: ${entryCase.eta}\n`;

  if (missingDocsInfo) prompt += `\n${missingDocsInfo}\n`;
  if (additionalContext) prompt += `\nAdditional context: ${additionalContext}\n`;

  prompt += `\nBrokerage name: Acme Customs Brokerage\n`;

  return prompt;
}

export function registerClientCommsAgent(): void {
  registerAgent({
    id: 'client-comms',
    name: 'Client Communications',
    description: 'Generates professional email drafts for client communications (missing docs, status updates, hold notifications, clearance).',
    type: 'communications',
    autonomyLevel: 'L0',
    tools: ['lookup_contacts', 'draft_email'],
    confidenceThreshold: 0.7,
    handler: handleClientComms,
  });
}
