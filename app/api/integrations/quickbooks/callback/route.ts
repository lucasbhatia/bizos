import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from '@/lib/supabase/auth-api';
import { getTokens } from "@/lib/integrations/quickbooks";

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const realmId = url.searchParams.get("realmId");

  if (!code) {
    return NextResponse.json({ error: "Missing authorization code" }, { status: 400 });
  }

  try {
    const tokens = await getTokens(code);

    // In production, store tokens securely (encrypted) in the database
    // associated with the tenant. For now, return success.
    return NextResponse.json({
      success: true,
      realm_id: realmId ?? tokens.realm_id,
      message: "QuickBooks connected successfully. Tokens should be stored securely.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to exchange tokens";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
