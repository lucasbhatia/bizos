import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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

  const supabase = createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id, tenant_id, role")
    .eq("id", authUser.id)
    .single();

  if (!profile || profile.role !== "admin") {
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

  const result = await executeAgent(
    "onboarding-agent",
    { data: parsed.data, trigger: "tenant_onboarding" },
    {
      tenantId: profile.tenant_id,
      userId: profile.id,
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
}
