import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/supabase/auth-api';
import {
  createTest,
  getActiveTests,
  getTestResults,
  concludeTest,
} from '@/lib/agents/ab-testing';
import { z } from 'zod';

export async function GET() {
  const auth = await authenticateApiRequest();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const tests = await getActiveTests(auth.tenantId);

  // Enrich with metrics
  const testsWithMetrics = await Promise.all(
    tests.map(async (test) => {
      const results = await getTestResults(auth.tenantId, test.id);
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
  const auth = await authenticateApiRequest();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const allowedRoles = ['admin', 'broker_lead', 'ops_manager'];
  if (!allowedRoles.includes(auth.role)) {
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
      auth.tenantId,
      data.agentId,
      data.name,
      data.variantA,
      data.variantB,
      data.trafficSplit
    );
    return NextResponse.json({ success: true, test });
  }

  if (data.action === 'conclude') {
    await concludeTest(auth.tenantId, data.testId, data.winner);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
