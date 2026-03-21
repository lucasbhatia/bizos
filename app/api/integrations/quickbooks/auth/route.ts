import { NextResponse } from "next/server";
import { authenticateApiRequest } from '@/lib/supabase/auth-api';
import { getAuthUrl } from "@/lib/integrations/quickbooks";
import { randomUUID } from "crypto";

export async function GET() {
  const auth = await authenticateApiRequest();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const state = randomUUID();
    const url = getAuthUrl(state);

    return NextResponse.json({ url, state });
  } catch (err) {
    const message = err instanceof Error ? err.message : "QuickBooks not configured";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
