import { NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/supabase/auth-api';
import { getAuthUrl } from '@/lib/email/gmail';

export async function GET() {
  const auth = await authenticateApiRequest();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Encode tenant_id in state for the callback
  const state = Buffer.from(
    JSON.stringify({ tenantId: auth.tenantId, userId: auth.userId })
  ).toString('base64url');

  const url = getAuthUrl(state);

  return NextResponse.redirect(url);
}
