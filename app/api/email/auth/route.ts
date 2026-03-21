import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthUrl } from '@/lib/email/gmail';

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

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json(
      { error: 'Only admins can connect email integrations' },
      { status: 403 }
    );
  }

  // Encode tenant_id in state for the callback
  const state = Buffer.from(
    JSON.stringify({ tenantId: profile.tenant_id, userId: profile.id })
  ).toString('base64url');

  const url = getAuthUrl(state);

  return NextResponse.redirect(url);
}
