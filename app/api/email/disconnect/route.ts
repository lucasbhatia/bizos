import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { clearTokens } from '@/lib/email/gmail';

export async function POST() {
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

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json(
      { error: 'Only admins can disconnect email integrations' },
      { status: 403 }
    );
  }

  try {
    await clearTokens(profile.tenant_id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Failed to disconnect Gmail:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to disconnect Gmail' },
      { status: 500 }
    );
  }
}
