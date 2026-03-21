import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

const approveSchema = z.object({
  caseId: z.string().uuid(),
  lineItemIndex: z.number(),
  htsCode: z.string().min(1),
  description: z.string(),
  logId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('users')
    .select('id, tenant_id, is_licensed_broker')
    .eq('id', authUser.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'User profile not found' }, { status: 403 });
  }

  if (!profile.is_licensed_broker) {
    return NextResponse.json({ error: 'Only licensed brokers can approve classifications' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = approveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { caseId, lineItemIndex, htsCode, description, logId } = parsed.data;
  const serviceClient = createServiceClient();

  // Get current case metadata
  const { data: entryCase } = await serviceClient
    .from('entry_cases')
    .select('metadata, tenant_id')
    .eq('id', caseId)
    .eq('tenant_id', profile.tenant_id)
    .single();

  if (!entryCase) {
    return NextResponse.json({ error: 'Case not found' }, { status: 404 });
  }

  // Save approved code in case metadata
  const metadata = (entryCase.metadata ?? {}) as Record<string, unknown>;
  const classifications = (metadata.approved_classifications ?? []) as {
    line_item_index: number;
    hts_code: string;
    description: string;
    approved_by: string;
    approved_at: string;
  }[];

  // Replace or add
  const existing = classifications.findIndex((c) => c.line_item_index === lineItemIndex);
  const entry = {
    line_item_index: lineItemIndex,
    hts_code: htsCode,
    description,
    approved_by: profile.id,
    approved_at: new Date().toISOString(),
  };

  if (existing >= 0) {
    classifications[existing] = entry;
  } else {
    classifications.push(entry);
  }

  metadata.approved_classifications = classifications;

  await serviceClient
    .from('entry_cases')
    .update({ metadata })
    .eq('id', caseId);

  // Log the approval
  if (logId) {
    await serviceClient
      .from('ai_action_logs')
      .update({
        human_decision: 'accepted',
        human_decision_by: profile.id,
        human_decision_reason: `Approved HTS ${htsCode} for line item ${lineItemIndex}`,
      })
      .eq('id', logId);
  }

  // Audit event
  await serviceClient.from('audit_events').insert({
    tenant_id: profile.tenant_id,
    event_type: 'classification.approved',
    entity_type: 'entry_case',
    entity_id: caseId,
    actor_type: 'user',
    actor_id: profile.id,
    action: `Approved HTS ${htsCode} for line item ${lineItemIndex}`,
    details: { hts_code: htsCode, line_item_index: lineItemIndex },
  });

  return NextResponse.json({ success: true });
}
