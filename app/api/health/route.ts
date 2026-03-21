import { NextResponse } from "next/server";
import { healthCheck } from "@/lib/monitoring";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await healthCheck();

    const statusCode = result.status === "healthy" ? 200 : 503;

    return NextResponse.json(result, { status: statusCode });
  } catch (err) {
    return NextResponse.json(
      {
        status: "unhealthy",
        checks: [],
        version: "unknown",
        uptime: 0,
        error: err instanceof Error ? err.message : "Health check failed",
      },
      { status: 503 }
    );
  }
}
