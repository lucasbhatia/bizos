import Anthropic from '@anthropic-ai/sdk';
import type { LLMOptions, LLMResponse } from '@/lib/types/agents';

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const DEFAULT_MAX_TOKENS = 4096;
const DEFAULT_TEMPERATURE = 0;
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set in environment variables');
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

export async function callClaude(options: LLMOptions): Promise<LLMResponse> {
  const {
    model = DEFAULT_MODEL,
    maxTokens = DEFAULT_MAX_TOKENS,
    temperature = DEFAULT_TEMPERATURE,
    systemPrompt,
    userPrompt,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const anthropic = getClient();

      const response = await anthropic.messages.create({
        model,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });

      const textBlock = response.content.find((block) => block.type === 'text');
      const rawContent = textBlock?.type === 'text' ? textBlock.text : '';
      const content = extractJSON(rawContent);

      return {
        content,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          model,
        },
        stopReason: response.stop_reason,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on auth errors
      if (lastError.message.includes('401') || lastError.message.includes('authentication')) {
        throw lastError;
      }

      // Exponential backoff for rate limits and server errors
      if (attempt < MAX_RETRIES - 1) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError ?? new Error('Claude API call failed after all retries');
}

/**
 * Extract JSON from Claude's response, stripping markdown code fences if present.
 * Claude often wraps JSON in ```json ... ``` blocks.
 */
function extractJSON(text: string): string {
  const trimmed = text.trim();

  // Match ```json ... ``` or ``` ... ```
  const fenceMatch = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }

  // If the text starts with { or [, it's already raw JSON
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return trimmed;
  }

  // Try to find JSON object/array within the text
  const jsonMatch = trimmed.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) {
    return jsonMatch[1];
  }

  // Return as-is if no JSON found
  return trimmed;
}
