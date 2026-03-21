import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  createTest,
  getActiveTests,
  getTestResults,
  concludeTest,
} from '@/lib/agents/ab-testing';
import { z } from 'zod';

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

  const tests = await getActiveTests(profile.tenant_id);

  // Enrich with metrics
  const testsWithMetrics = await Promise.all(
    tests.map(async (test) => {
      const results = await getTestResults(profile.tenant_id, test.id);
      return {
        ...test,
        variantAMetrics: results.variantA,
        variantBMetrics: results.variantB,
      };
    })
  );

  return NextResponse.json({ tests: testsWithMetrics });
}

const createSchema = z.object({
  action: z.literal('create'),
  agentId: z.string().min(1),
  name: z.string().min(1),
  variantA: z.string().min(1),
  variantB: z.string().min(1),
  trafficSplit: z.number().min(0.1).max(0.9),
});

const concludeSchema = z.object({
  action: z.literal('conclude'),
  testId: z.string().min(1),
  winner: z.enum(['A', 'B']),
});

const postSchema = z.union([createSchema, concludeSchema]);

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
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const data = parsed.data;

  if (data.action === 'create') {
    const test = await createTest(
      profile.tenant_id,
      data.agentId,
      data.name,
      data.variantA,
      data.variantB,
      data.trafficSplit
    );
    return NextResponse.json({ success: true, test });
  }

  if (data.action === 'conclude') {
    await concludeTest(profile.tenant_id, data.testId, data.winner);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
