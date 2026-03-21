import { registerAgent } from "@/lib/agents/registry";
import { callClaude } from "@/lib/agents/llm";
import type { AgentInput, AgentContext, AgentOutput } from "@/lib/types/agents";

const SYSTEM_PROMPT = `You are the BizOS Onboarding Agent. Your job is to generate configuration
recommendations for a new customs brokerage tenant.

Given details about the business (name, industry focus, team size), produce a JSON object with:
1. "business_units" - array of suggested business unit objects with "name", "location", and "port_code"
2. "task_templates" - array of default task template objects with "title", "description", and "task_type" (one of: review, approval, data_entry, client_request, escalation, filing_prep, other)
3. "sop_notes" - string with standard operating procedure notes for the brokerage
4. "commodity_profiles" - array of objects with "name" and "hts_prefix" for common commodity categories

Return ONLY valid JSON. No markdown code fences, no explanation.`;

async function handleOnboarding(
  input: AgentInput,
  _context: AgentContext
): Promise<AgentOutput> {
  const tenantName = input.data.tenantName as string | undefined;
  const industryFocus = input.data.industryFocus as string | undefined;
  const teamSize = input.data.teamSize as number | undefined;

  const userPrompt = `Generate onboarding configuration for this new customs brokerage tenant:

Tenant Name: ${tenantName ?? "New Brokerage"}
Industry Focus: ${industryFocus ?? "General customs brokerage"}
Team Size: ${teamSize ?? 5}

Provide practical, U.S. customs-specific recommendations. Include major ports if relevant to the industry focus.`;

  const llmResponse = await callClaude({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    maxTokens: 2048,
    temperature: 0.3,
  });

  let recommendations: Record<string, unknown>;
  try {
    recommendations = JSON.parse(llmResponse.content) as Record<
      string,
      unknown
    >;
  } catch {
    return {
      success: false,
      result: { raw: llmResponse.content },
      confidence: 0.2,
      citations: [],
      error: "Failed to parse agent response as JSON",
      tokensUsed: llmResponse.usage,
    };
  }

  return {
    success: true,
    result: recommendations,
    confidence: 0.85,
    citations: [
      {
        source: "onboarding-agent",
        text: "AI-generated configuration recommendations",
        confidence: 0.85,
      },
    ],
    tokensUsed: llmResponse.usage,
  };
}

export function registerOnboardingAgent(): void {
  registerAgent({
    id: "onboarding-agent",
    name: "Onboarding Agent",
    description:
      "Auto-configures new tenants with suggested business units, task templates, SOP notes, and commodity profiles.",
    type: "onboarding",
    autonomyLevel: "L0",
    tools: ["llm"],
    confidenceThreshold: 0.7,
    handler: handleOnboarding,
  });
}
