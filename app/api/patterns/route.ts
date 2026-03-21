import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  storePattern,
  listPatterns,
  searchPatterns,
  deletePattern,
} from '@/lib/agents/memory';
import type { PatternCategory } from '@/lib/agents/memory';
import { z } from 'zod';

const VALID_CATEGORIES: PatternCategory[] = [
  'classification_precedent',
  'client_preference',
  'compliance_note',
  'procedure',
];

export async function GET(request: NextRequest) {
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

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const category = searchParams.get('category') as PatternCategory | null;

  if (query) {
    const results = await searchPatterns(
      profile.tenant_id,
      query,
      category ?? undefined
    );
    return NextResponse.json({ patterns: results });
  }

  const patterns = await listPatterns(
    profile.tenant_id,
    category ?? undefined
  );
  return NextResponse.json({ patterns });
}

const createSchema = z.object({
  category: z.enum([
    'classification_precedent',
    'client_preference',
    'compliance_note',
    'procedure',
  ]),
  title: z.string().min(1),
  content: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
  sourceCaseId: z.string().uuid().optional(),
});

const deleteSchema = z.object({
  patternId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
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

  const allowedRoles = ['admin', 'broker_lead', 'ops_manager'];
  if (!allowedRoles.includes(profile.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const pattern = await storePattern({
    tenantId: profile.tenant_id,
    category: parsed.data.category,
    title: parsed.data.title,
    content: parsed.data.content,
    metadata: parsed.data.metadata,
    sourceCaseId: parsed.data.sourceCaseId,
    createdBy: profile.id,
  });

  return NextResponse.json({ success: true, pattern });
}

export async function DELETE(request: NextRequest) {
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

  if (profile.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  await deletePattern(profile.tenant_id, parsed.data.patternId);

  return NextResponse.json({ success: true });
}
