import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// ============================================================================
// Allowed tables and columns (whitelist for safety)
// ============================================================================

const ALLOWED_SOURCES: Record<string, { table: string; columns: string[] }> = {
  cases: {
    table: "entry_cases",
    columns: [
      "case_number", "status", "priority", "mode_of_transport",
      "eta", "actual_arrival", "risk_score", "created_at", "updated_at",
    ],
  },
  tasks: {
    table: "tasks",
    columns: [
      "title", "task_type", "status", "priority",
      "due_at", "completed_at", "created_at",
    ],
  },
  invoices: {
    table: "invoices",
    columns: [
      "invoice_number", "status", "subtotal", "tax", "total",
      "currency", "due_date", "paid_at", "created_at",
    ],
  },
  documents: {
    table: "documents",
    columns: [
      "file_name", "doc_type", "parse_status",
      "file_size_bytes", "version", "created_at",
    ],
  },
  agent_logs: {
    table: "ai_action_logs",
    columns: [
      "agent_type", "action", "confidence",
      "human_decision", "created_at",
    ],
  },
};

const ALLOWED_OPERATORS = ["eq", "neq", "gt", "gte", "lt", "lte", "like"] as const;

const filterSchema = z.object({
  column: z.string(),
  operator: z.enum(ALLOWED_OPERATORS),
  value: z.string(),
});

const requestSchema = z.object({
  source: z.enum(["cases", "tasks", "invoices", "documents", "agent_logs"]),
  columns: z.array(z.string()).min(1),
  filters: z.array(filterSchema).default([]),
  sort: z
    .object({
      column: z.string(),
      direction: z.enum(["asc", "desc"]),
    })
    .nullable()
    .default(null),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().min(1).max(500).default(100),
});

export async function POST(request: NextRequest) {
  const supabase = createClient();

  // Auth check
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { source, columns, filters, sort, page, pageSize } = parsed.data;
  const sourceDef = ALLOWED_SOURCES[source];

  if (!sourceDef) {
    return NextResponse.json({ error: "Invalid source" }, { status: 400 });
  }

  // Validate columns against whitelist
  const invalidColumns = columns.filter((c) => !sourceDef.columns.includes(c));
  if (invalidColumns.length > 0) {
    return NextResponse.json(
      { error: `Invalid columns: ${invalidColumns.join(", ")}` },
      { status: 400 }
    );
  }

  // Build select string — always include id
  const uniqueCols = Array.from(new Set(["id", ...columns]));
  const selectColumns = uniqueCols.join(", ");
  const offset = (page - 1) * pageSize;

  // Start query
  let query = supabase
    .from(sourceDef.table)
    .select(selectColumns, { count: "exact" });

  // Apply filters
  for (const filter of filters) {
    if (!sourceDef.columns.includes(filter.column)) continue;

    const col = filter.column;
    const val = filter.value;

    switch (filter.operator) {
      case "eq":
        query = query.eq(col, val);
        break;
      case "neq":
        query = query.neq(col, val);
        break;
      case "gt":
        query = query.gt(col, val);
        break;
      case "gte":
        query = query.gte(col, val);
        break;
      case "lt":
        query = query.lt(col, val);
        break;
      case "lte":
        query = query.lte(col, val);
        break;
      case "like":
        query = query.ilike(col, `%${val}%`);
        break;
    }
  }

  // Apply sort
  if (sort && sourceDef.columns.includes(sort.column)) {
    query = query.order(sort.column, { ascending: sort.direction === "asc" });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  // Pagination
  query = query.range(offset, offset + pageSize - 1);

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: data ?? [],
    count: count ?? 0,
    page,
    pageSize,
  });
}
