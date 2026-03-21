import { NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/supabase/auth-api';
import {
  analyzeErrors,
  generateRules,
  getStoredRules,
  saveRules,
} from '@/lib/agents/validation-rules';

export async function GET() {
  const auth = await authenticateApiRequest();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const rules = await getStoredRules(auth.tenantId);

  return NextResponse.json({ rules });
}

export async function POST() {
  const auth = await authenticateApiRequest();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const allowedRoles = ['admin', 'broker_lead'];
  if (!allowedRoles.includes(auth.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  // Analyze error patterns and generate new rules
  const patterns = await analyzeErrors(auth.tenantId);
  const newRules = generateRules(patterns);

  // Merge with existing rules (avoid duplicates by field+condition)
  const existingRules = await getStoredRules(auth.tenantId);
  const existingKeys = new Set(existingRules.map((r) => `${r.field}:${r.condition}:${r.value}`));

  const mergedRules = [
    ...existingRules,
    ...newRules.filter((r) => !existingKeys.has(`${r.field}:${r.condition}:${r.value}`)),
  ];

  await saveRules(auth.tenantId, mergedRules);

  return NextResponse.json({
    success: true,
    patternsFound: patterns.length,
    newRulesGenerated: newRules.length,
    totalRules: mergedRules.length,
  });
}
