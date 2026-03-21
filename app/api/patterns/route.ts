import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/supabase/auth-api';
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
  const auth = await authenticateApiRequest();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const category = searchParams.get('category') as PatternCategory | null;

  if (query) {
    const results = await searchPatterns(
      auth.tenantId,
      query,
      category ?? undefined
    );
    return NextResponse.json({ patterns: results });
  }

  const patterns = await listPatterns(
    auth.tenantId,
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
  const auth = await authenticateApiRequest();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const allowedRoles = ['admin', 'broker_lead', 'ops_manager'];
  if (!allowedRoles.includes(auth.role)) {
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
    tenantId: auth.tenantId,
    category: parsed.data.category,
    title: parsed.data.title,
    content: parsed.data.content,
    metadata: parsed.data.metadata,
    sourceCaseId: parsed.data.sourceCaseId,
    createdBy: auth.userId,
  });

  return NextResponse.json({ success: true, pattern });
}

export async function DELETE(request: NextRequest) {
  const auth = await authenticateApiRequest();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (auth.role !== 'admin') {
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

  await deletePattern(auth.tenantId, parsed.data.patternId);

  return NextResponse.json({ success: true });
}
