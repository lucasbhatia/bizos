import { NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/supabase/auth-api';
import { clearTokens } from '@/lib/email/gmail';

export async function POST() {
  const auth = await authenticateApiRequest();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await clearTokens(auth.tenantId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Failed to disconnect Gmail:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to disconnect Gmail' },
      { status: 500 }
    );
  }
}
