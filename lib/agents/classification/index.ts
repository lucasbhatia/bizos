import { registerAgent } from '@/lib/agents/registry';
import { callClaude } from '@/lib/agents/llm';
import { createServiceClient } from '@/lib/supabase/server';
import type { AgentInput, AgentContext, AgentOutput } from '@/lib/types/agents';

const SYSTEM_PROMPT = `You are an advisory classification assistant for BizOS, a U.S. customs brokerage operating system.

IMPORTANT: You do NOT make final classification decisions. You provide SUGGESTIONS for licensed customs brokers to review and approve.

Your task is to analyze product descriptions and suggest candidate HTS (Harmonized Tariff Schedule) codes.

For each product, you must:
1. Analyze the product description, materials, use, and composition
2. Suggest the top 3 candidate HTS codes
3. Apply the General Rules of Interpretation (GRI) in your reasoning
4. For each candidate, explain WHY it might be wrong
5. List questions that would help narrow the classification

RULES:
- Always provide multiple candidates (at least 2, preferably 3)
- Include duty rate estimates where possible
- If you cannot determine the classification with any confidence, say so clearly
- Never present a single code as "the answer"
- Reference specific GRI rules in your reasoning

Respond with valid JSON:
{
  "candidates": [
    {
      "hts_code": "8471.30.0100",
      "description": "Portable digital automatic data processing machines...",
      "confidence": 0.0-1.0,
      "duty_rate": "Free" or "X%",
      "rationale": "...",
      "gri_rules_applied": ["GRI 1", "GRI 3(a)"],
      "why_it_might_be_wrong": "..."
    }
  ],
  "disambiguating_questions": [
    { "question": "...", "why_it_matters": "..." }
  ],
  "historical_match": {
    "found": true/false,
    "previous_code": "...",
    "previous_product": "...",
    "applies_here": true/false,
    "reason": "..."
  },
  "overall_confidence": 0.0-1.0,
  "requires_broker_review": true/false,
  "notes": "..."
}`;

async function handleClassification(input: AgentInput, context: AgentContext): Promise<AgentOutput> {
  const {
    productDescription,
    materials,
    use,
    composition,
    countryOfOrigin,
    lineItemIndex,
  } = input.data as {
    productDescription: string;
    materials?: string;
    use?: string;
    composition?: string;
    countryOfOrigin?: string;
    lineItemIndex?: number;
  };

  if (!productDescription) {
    return {
      success: false,
      result: {},
      confidence: 0,
      citations: [],
      error: 'Missing product description',
    };
  }

  const supabase = createServiceClient();

  // Fetch client's commodity profile if case is linked
  let clientProfile: Record<string, unknown> | null = null;
  if (context.caseId) {
    const { data: caseData } = await supabase
      .from('entry_cases')
      .select('client_account:client_accounts(name, default_commodity_profile)')
      .eq('id', context.caseId)
      .single();

    if (caseData?.client_account) {
      const ca = caseData.client_account as unknown as { name: string; default_commodity_profile: Record<string, unknown> };
      clientProfile = ca.default_commodity_profile;
    }
  }

  // Check historical classifications from ai_action_logs
  const { data: historicalLogs } = await supabase
    .from('ai_action_logs')
    .select('inputs, outputs')
    .eq('tenant_id', context.tenantId)
    .eq('agent_type', 'classification-support')
    .eq('human_decision', 'accepted')
    .order('created_at', { ascending: false })
    .limit(10);

  const userPrompt = buildClassificationPrompt(
    productDescription,
    materials,
    use,
    composition,
    countryOfOrigin,
    clientProfile,
    historicalLogs ?? []
  );

  try {
    const llmResponse = await callClaude({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
      temperature: 0,
      maxTokens: 4096,
    });

    const parsed = JSON.parse(llmResponse.content);

    // If all candidates below 0.75 confidence, create broker review task
    const allLowConfidence = (parsed.candidates ?? []).every(
      (c: { confidence: number }) => c.confidence < 0.75
    );

    if (allLowConfidence || parsed.requires_broker_review) {
      await supabase.from('tasks').insert({
        tenant_id: context.tenantId,
        entry_case_id: context.caseId ?? null,
        title: `[AI Review] Licensed Broker Review Required — Classification`,
        description: `Classification confidence is below threshold for: "${productDescription}"\n\nAll candidates have confidence < 75%. A licensed broker must review and approve.`,
        task_type: 'approval',
        status: 'pending',
        priority: 'high',
        due_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
      });
    }

    const result = {
      candidates: parsed.candidates ?? [],
      disambiguating_questions: parsed.disambiguating_questions ?? [],
      historical_match: parsed.historical_match ?? { found: false },
      requires_broker_review: allLowConfidence || parsed.requires_broker_review,
      notes: parsed.notes ?? '',
      line_item_index: lineItemIndex,
    };

    return {
      success: true,
      result,
      confidence: parsed.overall_confidence ?? 0,
      citations: (parsed.candidates ?? []).map((c: { hts_code: string; rationale: string; confidence: number }) => ({
        source: c.hts_code,
        text: c.rationale,
        confidence: c.confidence,
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

function buildClassificationPrompt(
  description: string,
  materials?: string,
  use?: string,
  composition?: string,
  countryOfOrigin?: string,
  clientProfile?: Record<string, unknown> | null,
  historicalLogs?: { inputs: Record<string, unknown>; outputs: Record<string, unknown> }[]
): string {
  let prompt = `Classify the following product for U.S. customs entry:\n\n`;
  prompt += `Product Description: ${description}\n`;
  if (materials) prompt += `Materials: ${materials}\n`;
  if (use) prompt += `Intended Use: ${use}\n`;
  if (composition) prompt += `Composition: ${composition}\n`;
  if (countryOfOrigin) prompt += `Country of Origin: ${countryOfOrigin}\n`;

  if (clientProfile && Object.keys(clientProfile).length > 0) {
    prompt += `\nClient Commodity Profile: ${JSON.stringify(clientProfile)}\n`;
  }

  if (historicalLogs && historicalLogs.length > 0) {
    prompt += `\nPreviously approved classifications for this tenant:\n`;
    for (const log of historicalLogs.slice(0, 5)) {
      const inp = log.inputs as { productDescription?: string };
      const out = log.outputs as { candidates?: { hts_code: string }[] };
      if (inp.productDescription && out.candidates?.[0]) {
        prompt += `- "${inp.productDescription}" → ${out.candidates[0].hts_code}\n`;
      }
    }
  }

  return prompt;
}

export function registerClassificationAgent(): void {
  registerAgent({
    id: 'classification-support',
    name: 'Classification Support',
    description: 'Advisory agent that suggests HTS codes for product classification. PERMANENTLY L0 — never auto-approves.',
    type: 'classification',
    autonomyLevel: 'L0',
    tools: ['lookup_historical', 'create_review_task'],
    confidenceThreshold: 0.75,
    handler: handleClassification,
  });
}
