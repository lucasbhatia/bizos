// Step 36: A/B Prompt Testing Framework
// Infrastructure for running A/B tests on agent prompt variants

import { createServiceClient } from '@/lib/supabase/server';

export interface PromptTest {
  id: string;
  agentId: string;
  name: string;
  variantA: string;
  variantB: string;
  trafficSplit: number; // 0.0 to 1.0 — percentage going to variant A
  status: 'active' | 'concluded';
  winner: 'A' | 'B' | null;
  createdAt: string;
}

export interface PromptTestResult {
  testId: string;
  variant: 'A' | 'B';
  accepted: boolean;
  confidence: number;
  recordedAt: string;
}

export interface VariantMetrics {
  variant: 'A' | 'B';
  invocations: number;
  acceptCount: number;
  rejectCount: number;
  acceptRate: number;
  avgConfidence: number;
}

export interface TestWithMetrics extends PromptTest {
  variantAMetrics: VariantMetrics;
  variantBMetrics: VariantMetrics;
}

function generateId(): string {
  return crypto.randomUUID();
}

export async function createTest(
  tenantId: string,
  agentId: string,
  name: string,
  variantA: string,
  variantB: string,
  trafficSplit: number
): Promise<PromptTest> {
  const supabase = createServiceClient();

  // Store in tenant settings under prompt_tests key
  const { data: tenant } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  const settings = (tenant?.settings ?? {}) as Record<string, unknown>;
  const promptTests = (settings.prompt_tests ?? []) as PromptTest[];

  const newTest: PromptTest = {
    id: generateId(),
    agentId,
    name,
    variantA,
    variantB,
    trafficSplit: Math.max(0, Math.min(1, trafficSplit)),
    status: 'active',
    winner: null,
    createdAt: new Date().toISOString(),
  };

  promptTests.push(newTest);
  settings.prompt_tests = promptTests;

  await supabase
    .from('tenants')
    .update({ settings })
    .eq('id', tenantId);

  return newTest;
}

export async function getActiveVariant(
  tenantId: string,
  agentId: string,
  testId: string
): Promise<{ variant: 'A' | 'B'; prompt: string } | null> {
  const supabase = createServiceClient();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  const settings = (tenant?.settings ?? {}) as Record<string, unknown>;
  const promptTests = (settings.prompt_tests ?? []) as PromptTest[];

  const test = promptTests.find(
    (t) => t.id === testId && t.agentId === agentId && t.status === 'active'
  );

  if (!test) return null;

  const random = Math.random();
  const variant: 'A' | 'B' = random < test.trafficSplit ? 'A' : 'B';
  const prompt = variant === 'A' ? test.variantA : test.variantB;

  return { variant, prompt };
}

export async function recordResult(
  tenantId: string,
  testId: string,
  variant: 'A' | 'B',
  accepted: boolean,
  confidence: number
): Promise<void> {
  const supabase = createServiceClient();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  const settings = (tenant?.settings ?? {}) as Record<string, unknown>;
  const testResults = (settings.prompt_test_results ?? []) as PromptTestResult[];

  testResults.push({
    testId,
    variant,
    accepted,
    confidence,
    recordedAt: new Date().toISOString(),
  });

  settings.prompt_test_results = testResults;

  await supabase
    .from('tenants')
    .update({ settings })
    .eq('id', tenantId);
}

export async function getTestResults(
  tenantId: string,
  testId: string
): Promise<{ variantA: VariantMetrics; variantB: VariantMetrics }> {
  const supabase = createServiceClient();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  const settings = (tenant?.settings ?? {}) as Record<string, unknown>;
  const allResults = (settings.prompt_test_results ?? []) as PromptTestResult[];
  const results = allResults.filter((r) => r.testId === testId);

  function computeMetrics(variant: 'A' | 'B'): VariantMetrics {
    const variantResults = results.filter((r) => r.variant === variant);
    const invocations = variantResults.length;
    const acceptCount = variantResults.filter((r) => r.accepted).length;
    const rejectCount = invocations - acceptCount;
    const acceptRate = invocations > 0 ? acceptCount / invocations : 0;
    const avgConfidence =
      invocations > 0
        ? variantResults.reduce((sum, r) => sum + r.confidence, 0) / invocations
        : 0;

    return { variant, invocations, acceptCount, rejectCount, acceptRate, avgConfidence };
  }

  return {
    variantA: computeMetrics('A'),
    variantB: computeMetrics('B'),
  };
}

export async function getActiveTests(tenantId: string): Promise<PromptTest[]> {
  const supabase = createServiceClient();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  const settings = (tenant?.settings ?? {}) as Record<string, unknown>;
  const promptTests = (settings.prompt_tests ?? []) as PromptTest[];

  return promptTests;
}

export async function concludeTest(
  tenantId: string,
  testId: string,
  winner: 'A' | 'B'
): Promise<void> {
  const supabase = createServiceClient();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  const settings = (tenant?.settings ?? {}) as Record<string, unknown>;
  const promptTests = (settings.prompt_tests ?? []) as PromptTest[];

  const testIndex = promptTests.findIndex((t) => t.id === testId);
  if (testIndex >= 0) {
    promptTests[testIndex] = {
      ...promptTests[testIndex],
      status: 'concluded',
      winner,
    };
    settings.prompt_tests = promptTests;

    await supabase
      .from('tenants')
      .update({ settings })
      .eq('id', tenantId);
  }
}
