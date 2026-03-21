import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getEmailSettings } from '@/lib/email/gmail';

export async function GET() {
  const supabase = createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('users')
    .select('id, tenant_id, role')
    .eq('id', authUser.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'User profile not found' }, { status: 403 });
  }

  const settings = await getEmailSettings(profile.tenant_id);

  return NextResponse.json({
    connected: !!settings.gmail_tokens,
    lastSyncAt: settings.last_sync_at ?? null,
    processedCount: settings.processed_message_ids?.length ?? 0,
  });
}
