import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from '@/lib/supabase/auth-api';
import { createServiceClient } from '@/lib/supabase/server';
import { markMessagesReadSchema } from "@/lib/validators/schemas";

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();

  const body = await request.json();
  const parsed = markMessagesReadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const { error } = await supabase
    .from("messages")
    .update({ is_read: true })
    .in("id", parsed.data.messageIds);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
