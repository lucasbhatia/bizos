import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTokensFromCode, storeTokens } from '@/lib/email/gmail';
import { z } from 'zod';

const stateSchema = z.object({
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
});

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const stateParam = searchParams.get('state');
  const errorParam = searchParams.get('error');

  if (errorParam) {
    const redirectUrl = new URL('/settings', request.nextUrl.origin);
    redirectUrl.searchParams.set('email_error', errorParam);
    return NextResponse.redirect(redirectUrl);
  }

  if (!code || !stateParam) {
    return NextResponse.json(
      { error: 'Missing code or state parameter' },
      { status: 400 }
    );
  }

  // Verify the current user matches the state
  const supabase = createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.redirect(new URL('/login', request.nextUrl.origin));
  }

  // Decode and validate state
  let state: z.infer<typeof stateSchema>;
  try {
    const decoded = Buffer.from(stateParam, 'base64url').toString('utf-8');
    state = stateSchema.parse(JSON.parse(decoded));
  } catch {
    return NextResponse.json({ error: 'Invalid state parameter' }, { status: 400 });
  }

  // Ensure the authenticated user matches the state
  if (authUser.id !== state.userId) {
    return NextResponse.json(
      { error: 'State mismatch: authenticated user differs from OAuth initiator' },
      { status: 403 }
    );
  }

  // Verify admin role
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', authUser.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json(
      { error: 'Only admins can connect email integrations' },
      { status: 403 }
    );
  }

  try {
    const tokens = await getTokensFromCode(code);
    await storeTokens(state.tenantId, tokens);

    const redirectUrl = new URL('/settings', request.nextUrl.origin);
    redirectUrl.searchParams.set('email_success', 'connected');
    return NextResponse.redirect(redirectUrl);
  } catch (err) {
    console.error('Gmail OAuth callback error:', err);
    const redirectUrl = new URL('/settings', request.nextUrl.origin);
    redirectUrl.searchParams.set(
      'email_error',
      err instanceof Error ? err.message : 'Failed to connect Gmail'
    );
    return NextResponse.redirect(redirectUrl);
  }
}
