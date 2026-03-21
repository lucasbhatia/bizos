import { registerAgent } from '@/lib/agents/registry';
import { callClaude } from '@/lib/agents/llm';
import { createServiceClient } from '@/lib/supabase/server';
import type { AgentInput, AgentContext, AgentOutput } from '@/lib/types/agents';
import type { DocType } from '@/lib/types/database';

const EXTRACTION_SCHEMAS: Record<string, string[]> = {
  commercial_invoice: [
    'shipper', 'consignee', 'invoice_number', 'invoice_date', 'currency',
    'total_value', 'line_items',
  ],
  packing_list: [
    'total_packages', 'gross_weight', 'net_weight', 'dimensions', 'package_type',
  ],
  bill_of_lading: [
    'bl_number', 'vessel_name', 'voyage', 'port_of_loading', 'port_of_discharge',
    'container_numbers',
  ],
  airway_bill: [
    'awb_number', 'flight', 'origin', 'destination', 'pieces',
  ],
};

const SYSTEM_PROMPT = `You are a customs document parsing agent for BizOS, a customs brokerage operating system.

Your job is to:
1. Classify the document type
2. Extract structured fields from the document
3. Validate extracted data against any case context provided

RULES:
- If you cannot find evidence for a field, set value to null and confidence to 0. Never guess.
- Each extracted field must include: value, confidence (0-1), source (quoted text from document)
- Confidence should reflect how certain you are about the extraction
- For line items, extract each line as a separate object
- Flag any inconsistencies between document data and case context

Respond with valid JSON only, matching this schema:
{
  "classified_type": "commercial_invoice" | "packing_list" | "bill_of_lading" | "airway_bill" | "arrival_notice" | "poa" | "certificate_of_origin" | "isf_data" | "other",
  "classification_confidence": 0.0-1.0,
  "extracted_fields": {
    "<field_name>": {
      "value": <extracted value or null>,
      "confidence": 0.0-1.0,
      "source": "<quoted text from document>"
    }
  },
  "line_items": [
    {
      "description": "...",
      "quantity": ...,
      "unit_price": ...,
      "total": ...,
      "country_of_origin": "...",
      "hs_code_hint": "..."
    }
  ],
  "inconsistencies": [
    {
      "field": "...",
      "issue": "...",
      "severity": "low" | "medium" | "high"
    }
  ],
  "overall_confidence": 0.0-1.0
}`;

async function handleDocumentParse(input: AgentInput, context: AgentContext): Promise<AgentOutput> {
  const { documentId, documentText, expectedDocType, clientName } = input.data as {
    documentId: string;
    documentText: string;
    expectedDocType?: DocType;
    clientName?: string;
  };

  if (!documentId || !documentText) {
    return {
      success: false,
      result: {},
      confidence: 0,
      citations: [],
      error: 'Missing documentId or documentText',
    };
  }

  const supabase = createServiceClient();

  // Update parse status to processing
  await supabase
    .from('documents')
    .update({ parse_status: 'processing' })
    .eq('id', documentId);

  const userPrompt = buildUserPrompt(
    documentText as string,
    expectedDocType,
    clientName
  );

  try {
    const llmResponse = await callClaude({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
      temperature: 0,
      maxTokens: 4096,
    });

    const parsed = JSON.parse(llmResponse.content);

    // Build extracted_data for storage
    const extractedData = {
      classified_type: parsed.classified_type,
      classification_confidence: parsed.classification_confidence,
      fields: parsed.extracted_fields,
      line_items: parsed.line_items ?? [],
      inconsistencies: parsed.inconsistencies ?? [],
      overall_confidence: parsed.overall_confidence,
      parsed_at: new Date().toISOString(),
    };

    // Update document with extracted data
    await supabase
      .from('documents')
      .update({
        parse_status: 'completed',
        extracted_data: extractedData,
      })
      .eq('id', documentId);

    // Create follow-up tasks for low-confidence fields or inconsistencies
    const lowConfidenceFields = Object.entries(parsed.extracted_fields ?? {})
      .filter(([, field]) => {
        const f = field as { confidence: number };
        return f.confidence < 0.7 && f.confidence > 0;
      })
      .map(([name]) => name);

    if (lowConfidenceFields.length > 0 || (parsed.inconsistencies ?? []).length > 0) {
      const issues: string[] = [];
      if (lowConfidenceFields.length > 0) {
        issues.push(`Low confidence fields: ${lowConfidenceFields.join(', ')}`);
      }
      for (const inc of parsed.inconsistencies ?? []) {
        const inconsistency = inc as { field: string; issue: string };
        issues.push(`Inconsistency in ${inconsistency.field}: ${inconsistency.issue}`);
      }

      await supabase.from('tasks').insert({
        tenant_id: context.tenantId,
        entry_case_id: context.caseId ?? null,
        title: `[AI Review] Document parsing needs review`,
        description: `The document parser flagged the following:\n${issues.map((i) => `• ${i}`).join('\n')}`,
        task_type: 'review',
        status: 'pending',
        priority: (parsed.inconsistencies ?? []).some((i: { severity: string }) => i.severity === 'high') ? 'high' : 'normal',
        due_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
      });
    }

    // Check if classified type doesn't match expected
    if (expectedDocType && parsed.classified_type !== expectedDocType) {
      await supabase.from('tasks').insert({
        tenant_id: context.tenantId,
        entry_case_id: context.caseId ?? null,
        title: `[AI Alert] Document type mismatch`,
        description: `Document was uploaded as "${expectedDocType}" but AI classified it as "${parsed.classified_type}" (confidence: ${(parsed.classification_confidence * 100).toFixed(0)}%).`,
        task_type: 'review',
        status: 'pending',
        priority: 'high',
        due_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      });
    }

    return {
      success: true,
      result: extractedData,
      confidence: parsed.overall_confidence ?? 0,
      citations: Object.entries(parsed.extracted_fields ?? {}).map(([field, data]) => {
        const d = data as { source: string; confidence: number };
        return {
          source: field,
          text: d.source ?? '',
          confidence: d.confidence ?? 0,
        };
      }),
      tokensUsed: llmResponse.usage,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Mark as failed
    await supabase
      .from('documents')
      .update({
        parse_status: 'failed',
        extracted_data: { error: errorMessage, failed_at: new Date().toISOString() },
      })
      .eq('id', documentId);

    return {
      success: false,
      result: { error: errorMessage },
      confidence: 0,
      citations: [],
      error: errorMessage,
    };
  }
}

function buildUserPrompt(
  documentText: string,
  expectedDocType?: DocType,
  clientName?: string
): string {
  let prompt = `Parse the following customs document and extract all relevant fields.\n\n`;

  if (expectedDocType) {
    const expectedFields = EXTRACTION_SCHEMAS[expectedDocType];
    prompt += `Expected document type: ${expectedDocType}\n`;
    if (expectedFields) {
      prompt += `Expected fields to extract: ${expectedFields.join(', ')}\n`;
    }
  }

  if (clientName) {
    prompt += `Case client name: ${clientName} (check if consignee matches)\n`;
  }

  prompt += `\n--- DOCUMENT TEXT ---\n${documentText}\n--- END DOCUMENT ---`;

  return prompt;
}

export function registerDocumentParserAgent(): void {
  registerAgent({
    id: 'document-parser',
    name: 'Document Parser',
    description: 'Classifies documents and extracts structured data from customs documents (invoices, BLs, packing lists, etc.)',
    type: 'parser',
    autonomyLevel: 'L0',
    tools: ['read_document', 'update_document', 'create_task'],
    confidenceThreshold: 0.7,
    handler: handleDocumentParse,
  });
}
