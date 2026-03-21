import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  analyzeErrors,
  generateRules,
  getStoredRules,
  saveRules,
} from '@/lib/agents/validation-rules';

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

  const rules = await getStoredRules(profile.tenant_id);

  return NextResponse.json({ rules });
}

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

  if (!profile) {
    return NextResponse.json({ error: 'User profile not found' }, { status: 403 });
  }

  const allowedRoles = ['admin', 'broker_lead'];
  if (!allowedRoles.includes(profile.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  // Analyze error patterns and generate new rules
  const patterns = await analyzeErrors(profile.tenant_id);
  const newRules = generateRules(patterns);

  // Merge with existing rules (avoid duplicates by field+condition)
  const existingRules = await getStoredRules(profile.tenant_id);
  const existingKeys = new Set(existingRules.map((r) => `${r.field}:${r.condition}:${r.value}`));

  const mergedRules = [
    ...existingRules,
    ...newRules.filter((r) => !existingKeys.has(`${r.field}:${r.condition}:${r.value}`)),
  ];

  await saveRules(profile.tenant_id, mergedRules);

  return NextResponse.json({
    success: true,
    patternsFound: patterns.length,
    newRulesGenerated: newRules.length,
    totalRules: mergedRules.length,
  });
}
