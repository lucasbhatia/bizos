import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/supabase/auth-api';
import { createServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

const decisionSchema = z.object({
  documentId: z.string().uuid(),
  field: z.string(),
  decision: z.enum(['accepted', 'rejected', 'modified']),
  modifiedValue: z.unknown().optional(),
  reason: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json();
  const parsed = decisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
  }

  const { documentId, field, decision, modifiedValue, reason } = parsed.data;

  const serviceClient = createServiceClient();

  // Fetch document
  const { data: doc } = await serviceClient
    .from('documents')
    .select('id, tenant_id, extracted_data')
    .eq('id', documentId)
    .eq('tenant_id', auth.tenantId)
    .single();

  if (!doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  // Update extracted_data with human decision
  const extractedData = (doc.extracted_data ?? {}) as Record<string, unknown>;
  const fields = (extractedData.fields ?? {}) as Record<string, Record<string, unknown>>;

  if (fields[field]) {
    fields[field].human_decision = decision;
    fields[field].human_decision_by = auth.userId;
    if (decision === 'modified' && modifiedValue !== undefined) {
      fields[field].original_value = fields[field].value;
      fields[field].value = modifiedValue;
    }
  }

  extractedData.fields = fields;

  await serviceClient
    .from('documents')
    .update({ extracted_data: extractedData })
    .eq('id', documentId);

  // Log to ai_action_logs
  await serviceClient.from('ai_action_logs').insert({
    tenant_id: auth.tenantId,
    agent_type: 'document-parser',
    entry_case_id: null,
    action: `Human ${decision} field: ${field}`,
    inputs: { document_id: documentId, field, decision },
    outputs: { modified_value: modifiedValue },
    confidence: null,
    citations: [],
    human_decision: decision,
    human_decision_by: auth.userId,
    human_decision_reason: reason ?? null,
  });

  return NextResponse.json({ success: true });
}
