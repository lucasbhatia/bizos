import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from '@/lib/supabase/auth-api';
import { createServiceClient } from '@/lib/supabase/server';
import { createCaseSchema } from "@/lib/validators/schemas";

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  const body = await request.json();
  const parsed = createCaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  // Generate case number
  const { data: caseNum } = await supabase.rpc("generate_case_number", {
    p_tenant_id: auth.tenantId,
  });

  // Fallback case number if function doesn't exist yet
  const caseNumber = caseNum ?? `case-${Date.now()}`;

  // Create the case
  const { data: entryCase, error: caseError } = await supabase
    .from("entry_cases")
    .insert({
      tenant_id: auth.tenantId,
      case_number: caseNumber,
      status: "intake",
      ...parsed.data,
    })
    .select()
    .single();

  if (caseError) {
    return NextResponse.json({ error: caseError.message }, { status: 500 });
  }

  // Create initial workflow event
  await supabase.from("workflow_events").insert({
    tenant_id: auth.tenantId,
    entry_case_id: entryCase.id,
    from_status: null,
    to_status: "intake",
    triggered_by_user_id: auth.userId,
  });

  // Create initial tasks
  const tasks: {
    tenant_id: string;
    entry_case_id: string;
    assigned_user_id: string | null;
    title: string;
    task_type: string;
    priority: string;
    due_at: string | null;
  }[] = [
    {
      tenant_id: auth.tenantId,
      entry_case_id: entryCase.id,
      assigned_user_id: parsed.data.assigned_user_id ?? null,
      title: "Collect required documents",
      task_type: "data_entry",
      priority: parsed.data.priority,
      due_at: parsed.data.eta ?? null,
    },
  ];

  // Find an ops_manager for review task
  const { data: opsUsers } = await supabase
    .from("users")
    .select("id")
    .eq("tenant_id", auth.tenantId)
    .eq("role", "ops_manager")
    .eq("is_active", true)
    .limit(1);

  if (opsUsers && opsUsers.length > 0) {
    tasks.push({
      tenant_id: auth.tenantId,
      entry_case_id: entryCase.id,
      assigned_user_id: opsUsers[0].id,
      title: "Review case setup",
      task_type: "review",
      priority: "normal",
      due_at: null,
    });
  }

  await supabase.from("tasks").insert(tasks);

  // Audit event
  await supabase.from("audit_events").insert({
    tenant_id: auth.tenantId,
    event_type: "case.created",
    entity_type: "entry_case",
    entity_id: entryCase.id,
    actor_type: "user",
    actor_id: auth.userId,
    action: `Created case ${caseNumber}`,
    details: {
      client_account_id: parsed.data.client_account_id,
      mode: parsed.data.mode_of_transport,
      priority: parsed.data.priority,
    },
  });

  return NextResponse.json({ success: true, case: entryCase });
}
