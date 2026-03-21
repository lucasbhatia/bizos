import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

const importTargets = ["client_accounts", "contacts", "entry_cases"] as const;
type ImportTarget = (typeof importTargets)[number];

const importSchema = z.object({
  target: z.enum(importTargets),
  records: z.array(z.record(z.unknown())).min(1).max(1000),
});

// Validation schemas per target
const clientAccountSchema = z.object({
  name: z.string().min(1),
  importer_of_record_number: z.string().optional().default(""),
  sop_notes: z.string().optional().default(""),
  is_active: z
    .union([z.boolean(), z.string()])
    .transform((v) => v === true || v === "true")
    .optional()
    .default(true),
});

const contactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  role: z.string().optional().nullable(),
  is_primary: z
    .union([z.boolean(), z.string()])
    .transform((v) => v === true || v === "true")
    .optional()
    .default(false),
});

const entryCaseSchema = z.object({
  case_number: z.string().min(1),
  mode_of_transport: z.enum(["ocean", "air", "truck", "rail"]).default("ocean"),
  status: z
    .enum([
      "intake",
      "awaiting_docs",
      "docs_validated",
      "classification_review",
      "entry_prep",
      "submitted",
      "govt_review",
      "hold",
      "released",
      "billing",
      "closed",
      "archived",
    ])
    .default("closed"),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  eta: z.string().optional().nullable(),
});

function getSchemaForTarget(target: ImportTarget) {
  switch (target) {
    case "client_accounts":
      return clientAccountSchema;
    case "contacts":
      return contactSchema;
    case "entry_cases":
      return entryCaseSchema;
  }
}

export async function POST(request: NextRequest) {
  // Auth check - admin only
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
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = importSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { target, records } = parsed.data;
  const schema = getSchemaForTarget(target);
  const service = createServiceClient();

  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];
  const validRecords: Record<string, unknown>[] = [];

  // Validate each record
  for (let i = 0; i < records.length; i++) {
    const result = schema.safeParse(records[i]);
    if (result.success) {
      const record: Record<string, unknown> = {
        ...result.data,
        tenant_id: profile.tenant_id,
      };

      // For entry_cases, need a client_account_id
      if (target === "entry_cases") {
        // Try to find first client account for this tenant
        const { data: firstClient } = await service
          .from("client_accounts")
          .select("id")
          .eq("tenant_id", profile.tenant_id)
          .limit(1)
          .single();

        if (firstClient) {
          record.client_account_id = firstClient.id;
        } else {
          errors.push(`Row ${i + 1}: No client account found to associate case with`);
          errorCount++;
          continue;
        }
      }

      validRecords.push(record);
    } else {
      const fieldErrors = result.error.flatten().fieldErrors;
      const msg = Object.entries(fieldErrors)
        .map(([k, v]) => `${k}: ${(v as string[]).join(", ")}`)
        .join("; ");
      errors.push(`Row ${i + 1}: ${msg}`);
      errorCount++;
    }
  }

  // Batch insert valid records
  if (validRecords.length > 0) {
    const { error: insertErr, data: inserted } = await service
      .from(target)
      .insert(validRecords)
      .select("id");

    if (insertErr) {
      errors.push(`Database error: ${insertErr.message}`);
      errorCount += validRecords.length;
    } else {
      successCount = inserted?.length ?? 0;
    }
  }

  return NextResponse.json({
    success_count: successCount,
    error_count: errorCount,
    errors,
  });
}
