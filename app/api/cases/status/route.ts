import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from '@/lib/supabase/auth-api';
import { createServiceClient } from '@/lib/supabase/server';
import { VALID_STATUS_TRANSITIONS } from "@/lib/types/database";
import type { CaseStatus } from "@/lib/types/database";
import { updateCaseStatusSchema } from "@/lib/validators/schemas";

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();

  const body = await request.json();
  const parsed = updateCaseStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const { case_id, new_status, reason } = parsed.data;

  // Fetch current case
  const { data: entryCase, error: fetchError } = await supabase
    .from("entry_cases")
    .select("id, status, tenant_id")
    .eq("id", case_id)
    .single();

  if (fetchError || !entryCase) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  // Validate transition
  const currentStatus = entryCase.status as CaseStatus;
  const validTransitions = VALID_STATUS_TRANSITIONS[currentStatus] ?? [];
  if (!validTransitions.includes(new_status)) {
    return NextResponse.json(
      { error: `Invalid transition from ${currentStatus} to ${new_status}` },
      { status: 400 }
    );
  }

  // Update case status
  const { error: updateError } = await supabase
    .from("entry_cases")
    .update({ status: new_status })
    .eq("id", case_id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Create workflow event
  await supabase.from("workflow_events").insert({
    tenant_id: entryCase.tenant_id,
    entry_case_id: case_id,
    from_status: currentStatus,
    to_status: new_status,
    triggered_by_user_id: auth.userId,
    reason: reason ?? null,
  });

  // Create audit event
  await supabase.from("audit_events").insert({
    tenant_id: entryCase.tenant_id,
    event_type: "case.status_changed",
    entity_type: "entry_case",
    entity_id: case_id,
    actor_type: "user",
    actor_id: auth.userId,
    action: `Changed status from ${currentStatus} to ${new_status}`,
    details: { from: currentStatus, to: new_status, reason: reason ?? null },
  });

  return NextResponse.json({ success: true });
}
