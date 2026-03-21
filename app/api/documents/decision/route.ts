import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

const decisionSchema = z.object({
  documentId: z.string().uuid(),
  field: z.string(),
  decision: z.enum(['accepted', 'rejected', 'modified']),
  modifiedValue: z.unknown().optional(),
  reason: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('users')
    .select('id, tenant_id')
    .eq('id', authUser.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'User profile not found' }, { status: 403 });
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
    .eq('tenant_id', profile.tenant_id)
    .single();

  if (!doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  // Update extracted_data with human decision
  const extractedData = (doc.extracted_data ?? {}) as Record<string, unknown>;
  const fields = (extractedData.fields ?? {}) as Record<string, Record<string, unknown>>;

  if (fields[field]) {
    fields[field].human_decision = decision;
    fields[field].human_decision_by = profile.id;
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
    tenant_id: profile.tenant_id,
    agent_type: 'document-parser',
    entry_case_id: null,
    action: `Human ${decision} field: ${field}`,
    inputs: { document_id: documentId, field, decision },
    outputs: { modified_value: modifiedValue },
    confidence: null,
    citations: [],
    human_decision: decision,
    human_decision_by: profile.id,
    human_decision_reason: reason ?? null,
  });

  return NextResponse.json({ success: true });
}
