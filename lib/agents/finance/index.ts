import { registerAgent } from '@/lib/agents/registry';
import { callClaude } from '@/lib/agents/llm';
import { createServiceClient } from '@/lib/supabase/server';
import type { AgentInput, AgentContext, AgentOutput } from '@/lib/types/agents';

const SYSTEM_PROMPT = `You are the Finance Agent for BizOS, a customs brokerage operating system.

When a case moves to "billing" status, you generate an invoice draft based on the case details and client billing terms.

Given case data, client billing terms, and case attributes, generate a structured invoice with line items.

Standard brokerage fee components:
- Customs Entry Filing Fee (base fee per entry type)
- Merchandise Processing Fee (MPF) - ad valorem based
- Harbor Maintenance Fee (HMF) - for ocean shipments only
- ISF Filing Fee (if applicable)
- Duty amount (based on HTS classification and value)
- Document handling fees
- Rush/Priority surcharge (if priority is urgent/high)
- Additional services as applicable

Respond with valid JSON:
{
  "invoice_lines": [
    {
      "description": "...",
      "category": "filing_fee" | "government_fee" | "duty" | "service_fee" | "surcharge",
      "quantity": 1,
      "unit_price": 0.00,
      "total": 0.00,
      "notes": "..."
    }
  ],
  "subtotal": 0.00,
  "tax": 0.00,
  "total": 0.00,
  "currency": "USD",
  "payment_terms": "...",
  "notes": "...",
  "confidence": 0.0-1.0
}`;

async function handleFinance(input: AgentInput, context: AgentContext): Promise<AgentOutput> {
  const { caseId } = input.data as { caseId?: string };
  const targetCaseId = caseId ?? context.caseId;

  if (!targetCaseId) {
    return { success: false, result: {}, confidence: 0, citations: [], error: 'No case ID provided' };
  }

  const supabase = createServiceClient();

  // Fetch case with client billing terms
  const { data: entryCase } = await supabase
    .from('entry_cases')
    .select('*, client_account:client_accounts(name, billing_terms, default_commodity_profile)')
    .eq('id', targetCaseId)
    .single();

  if (!entryCase) {
    return { success: false, result: {}, confidence: 0, citations: [], error: 'Case not found' };
  }

  const client = Array.isArray(entryCase.client_account) ? entryCase.client_account[0] : entryCase.client_account;

  // Fetch documents for value/weight info
  const { data: documents } = await supabase
    .from('documents')
    .select('doc_type, extracted_data')
    .eq('entry_case_id', targetCaseId)
    .eq('parse_status', 'completed');

  // Get approved classifications
  const metadata = (entryCase.metadata ?? {}) as Record<string, unknown>;
  const approvedClassifications = (metadata.approved_classifications ?? []) as { hts_code: string }[];

  const userPrompt = buildFinancePrompt(entryCase, client, documents ?? [], approvedClassifications);

  try {
    const llmResponse = await callClaude({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
      temperature: 0,
      maxTokens: 2048,
    });

    const parsed = JSON.parse(llmResponse.content);

    // Store draft invoice in case metadata
    const updatedMetadata = {
      ...metadata,
      draft_invoice: {
        ...parsed,
        generated_at: new Date().toISOString(),
        agent: 'finance-agent',
      },
    };

    await supabase
      .from('entry_cases')
      .update({ metadata: updatedMetadata })
      .eq('id', targetCaseId);

    // Create review task for finance role
    const { data: financeUsers } = await supabase
      .from('users')
      .select('id')
      .eq('tenant_id', context.tenantId)
      .eq('role', 'finance')
      .eq('is_active', true)
      .limit(1);

    await supabase.from('tasks').insert({
      tenant_id: context.tenantId,
      entry_case_id: targetCaseId,
      assigned_user_id: financeUsers?.[0]?.id ?? null,
      title: `Review + Send Invoice — ${entryCase.case_number}`,
      description: `AI-generated invoice draft for case ${entryCase.case_number}.\nClient: ${client?.name ?? 'Unknown'}\nTotal: $${parsed.total?.toFixed(2) ?? '0.00'}\n\nReview the draft invoice and send to client.`,
      task_type: 'approval',
      status: 'pending',
      priority: 'normal',
      due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    return {
      success: true,
      result: parsed,
      confidence: parsed.confidence ?? 0.8,
      citations: [],
      tokensUsed: llmResponse.usage,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, result: { error: errorMessage }, confidence: 0, citations: [], error: errorMessage };
  }
}

function buildFinancePrompt(
  entryCase: Record<string, unknown>,
  client: { name: string; billing_terms: unknown; default_commodity_profile: unknown } | null,
  documents: { doc_type: string; extracted_data: unknown }[],
  classifications: { hts_code: string }[]
): string {
  let prompt = `Generate an invoice draft for this customs entry case:\n\n`;
  prompt += `Case: ${entryCase.case_number}\n`;
  prompt += `Client: ${client?.name ?? 'Unknown'}\n`;
  prompt += `Mode: ${entryCase.mode_of_transport}\n`;
  prompt += `Priority: ${entryCase.priority}\n`;

  if (client?.billing_terms) {
    prompt += `\nClient billing terms: ${JSON.stringify(client.billing_terms)}\n`;
  }

  // Extract values from parsed documents
  for (const doc of documents) {
    const data = doc.extracted_data as Record<string, unknown>;
    if (doc.doc_type === 'commercial_invoice' && data?.fields) {
      prompt += `\nCommercial invoice data: ${JSON.stringify(data.fields)}\n`;
    }
  }

  if (classifications.length > 0) {
    prompt += `\nApproved HTS codes: ${classifications.map((c) => c.hts_code).join(', ')}\n`;
  }

  return prompt;
}

export function registerFinanceAgent(): void {
  registerAgent({
    id: 'finance-agent',
    name: 'Finance Agent',
    description: 'Generates invoice drafts when cases move to billing status.',
    type: 'finance',
    autonomyLevel: 'L0',
    tools: ['lookup_billing_terms', 'create_invoice_draft', 'create_task'],
    confidenceThreshold: 0.7,
    handler: handleFinance,
  });
}
