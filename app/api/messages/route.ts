import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from '@/lib/supabase/auth-api';
import { createServiceClient } from '@/lib/supabase/server';
import { createMessageSchema } from "@/lib/validators/schemas";
import { z } from "zod";

const querySchema = z.object({
  client_account_id: z.string().uuid().optional(),
  entry_case_id: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const { client_account_id, entry_case_id, page, limit } = parsed.data;

  let query = supabase
    .from("messages")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: true });

  if (client_account_id) {
    query = query.eq("client_account_id", client_account_id);
  }
  if (entry_case_id) {
    query = query.eq("entry_case_id", entry_case_id);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data: messages, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    messages: messages ?? [],
    total: count ?? 0,
    page,
    limit,
  });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();

  const tenantId = auth.tenantId;

  const body = await request.json();
  const parsed = createMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const { data: message, error } = await supabase
    .from("messages")
    .insert({
      tenant_id: tenantId,
      ...parsed.data,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Audit event
  await supabase.from("audit_events").insert({
    tenant_id: tenantId,
    event_type: "message.created",
    entity_type: "message",
    entity_id: message.id,
    actor_type: "user" as const,
    actor_id: auth.userId,
    action: `Sent message${parsed.data.entry_case_id ? ` on case` : ""}`,
    details: {
      sender_type: parsed.data.sender_type,
      client_account_id: parsed.data.client_account_id,
      entry_case_id: parsed.data.entry_case_id ?? null,
    },
  });

  return NextResponse.json({ success: true, message });
}
