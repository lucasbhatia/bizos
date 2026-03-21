import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/supabase/auth-api';
import { createServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

const confirmSchema = z.object({
  draft_case: z.object({
    client_id: z.string().uuid(),
    mode: z.enum(['ocean', 'air', 'truck', 'rail']),
    priority: z.enum(['low', 'normal', 'high', 'urgent']),
    eta: z.string().nullable(),
    notes: z.string().default(''),
    metadata: z.record(z.unknown()).default({}),
  }),
  business_unit_id: z.string().uuid().optional(),
  assigned_user_id: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json();
  const parsed = confirmSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
  }

  const { draft_case, business_unit_id, assigned_user_id } = parsed.data;
  const serviceClient = createServiceClient();

  // Create the entry case
  const { data: newCase, error: caseError } = await serviceClient
    .from('entry_cases')
    .insert({
      tenant_id: auth.tenantId,
      client_account_id: draft_case.client_id,
      business_unit_id: business_unit_id ?? null,
      assigned_user_id: assigned_user_id ?? null,
      mode_of_transport: draft_case.mode,
      status: 'intake',
      priority: draft_case.priority,
      eta: draft_case.eta,
      metadata: { ...draft_case.metadata, notes: draft_case.notes },
    })
    .select('id, case_number')
    .single();

  if (caseError) {
    return NextResponse.json({ error: caseError.message }, { status: 500 });
  }

  // Create workflow event
  await serviceClient.from('workflow_events').insert({
    tenant_id: auth.tenantId,
    entry_case_id: newCase.id,
    from_status: null,
    to_status: 'intake',
    triggered_by_user_id: auth.userId,
    triggered_by_agent: 'intake-agent',
    reason: 'Case created from intake agent draft',
  });

  // Create initial tasks
  const { data: specialists } = await serviceClient
    .from('users')
    .select('id')
    .eq('tenant_id', auth.tenantId)
    .eq('role', 'specialist')
    .eq('is_active', true)
    .limit(1);

  const { data: opsManagers } = await serviceClient
    .from('users')
    .select('id')
    .eq('tenant_id', auth.tenantId)
    .eq('role', 'ops_manager')
    .eq('is_active', true)
    .limit(1);

  const tasks = [
    {
      tenant_id: auth.tenantId,
      entry_case_id: newCase.id,
      assigned_user_id: assigned_user_id ?? specialists?.[0]?.id ?? null,
      title: 'Collect required documents',
      description: `Gather and upload all required documents for case ${newCase.case_number}`,
      task_type: 'data_entry' as const,
      status: 'pending' as const,
      priority: draft_case.priority,
      due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      tenant_id: auth.tenantId,
      entry_case_id: newCase.id,
      assigned_user_id: opsManagers?.[0]?.id ?? null,
      title: 'Review case setup',
      description: `Review intake for case ${newCase.case_number} created by AI intake agent`,
      task_type: 'review' as const,
      status: 'pending' as const,
      priority: 'normal' as const,
      due_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    },
  ];

  await serviceClient.from('tasks').insert(tasks);

  // Audit event
  await serviceClient.from('audit_events').insert({
    tenant_id: auth.tenantId,
    event_type: 'case.created_from_intake',
    entity_type: 'entry_case',
    entity_id: newCase.id,
    actor_type: 'user',
    actor_id: auth.userId,
    action: `Confirmed AI intake draft → created case ${newCase.case_number}`,
    details: { draft_case, agent: 'intake-agent' },
  });

  return NextResponse.json({
    success: true,
    case: newCase,
  });
}
