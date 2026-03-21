import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from '@/lib/supabase/auth-api';
import { executeAgent } from "@/lib/agents/runner";
import { initializeAgents } from "@/lib/agents/init";
import { z } from "zod";

const onboardingSchema = z.object({
  tenantName: z.string().min(1),
  industryFocus: z.string().optional(),
  teamSize: z.number().int().positive().optional(),
});

export async function POST(request: NextRequest) {
  initializeAgents();

  const auth = await authenticateApiRequest();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (auth.role !== 'admin') {
    return NextResponse.json(
      { error: "Only admins can run the onboarding agent" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = onboardingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const result = await executeAgent(
      "onboarding-agent",
      { data: parsed.data, trigger: "tenant_onboarding" },
      {
        tenantId: auth.tenantId,
        userId: auth.userId,
        triggerEvent: "tenant_onboarding",
      },
      "write"
    );

    return NextResponse.json({
      success: result.output.success,
      result: result.output.result,
      confidence: result.output.confidence,
      citations: result.output.citations,
      approvalRequired: result.approvalRequired,
      logId: result.logId,
      error: result.output.error,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Onboarding agent invocation failed: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
