import { NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/supabase/auth-api';
import { getEmailSettings } from '@/lib/email/gmail';

export async function GET() {
  const auth = await authenticateApiRequest();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const settings = await getEmailSettings(auth.tenantId);

  return NextResponse.json({
    connected: !!settings.gmail_tokens,
    lastSyncAt: settings.last_sync_at ?? null,
    processedCount: settings.processed_message_ids?.length ?? 0,
  });
}
