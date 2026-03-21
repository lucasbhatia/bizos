// ============================================================================
// Structured error and performance monitoring
// ============================================================================

interface ErrorContext {
  userId?: string;
  tenantId?: string;
  operation?: string;
  route?: string;
  [key: string]: unknown;
}

interface PerformanceMetadata {
  operation: string;
  route?: string;
  userId?: string;
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: "error" | "warn" | "info" | "perf";
  message: string;
  context?: Record<string, unknown>;
  stack?: string;
}

// In-memory log buffer for recent entries (production would use external service)
const LOG_BUFFER_MAX = 500;
const logBuffer: LogEntry[] = [];

function pushLog(entry: LogEntry) {
  logBuffer.push(entry);
  if (logBuffer.length > LOG_BUFFER_MAX) {
    logBuffer.shift();
  }
}

/**
 * Log a structured error with context
 */
export function logError(error: unknown, context?: ErrorContext): void {
  const message =
    error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: "error",
    message,
    context: context as Record<string, unknown>,
    stack,
  };

  pushLog(entry);

  // Also log to console in development
  if (process.env.NODE_ENV !== "production") {
    console.error("[BizOS Error]", message, context);
  }
}

/**
 * Log performance metrics
 */
export function logPerformance(
  operation: string,
  durationMs: number,
  metadata?: Omit<PerformanceMetadata, "operation">
): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: "perf",
    message: `${operation} completed in ${durationMs}ms`,
    context: { operation, durationMs, ...metadata },
  };

  pushLog(entry);

  // Warn on slow operations
  if (durationMs > 5000) {
    console.warn(`[BizOS Perf] Slow operation: ${operation} took ${durationMs}ms`);
  }
}

/**
 * Retrieve recent log entries
 */
export function getRecentLogs(
  level?: LogEntry["level"],
  limit = 50
): LogEntry[] {
  const filtered = level
    ? logBuffer.filter((e) => e.level === level)
    : logBuffer;
  return filtered.slice(-limit).reverse();
}

/**
 * Health check — verifies critical subsystems
 */
export async function healthCheck(): Promise<{
  status: "healthy" | "degraded" | "unhealthy";
  checks: {
    name: string;
    status: "ok" | "error";
    responseTimeMs: number;
    message?: string;
  }[];
  version: string;
  uptime: number;
}> {
  const checks: {
    name: string;
    status: "ok" | "error";
    responseTimeMs: number;
    message?: string;
  }[] = [];

  // Check environment variables
  const envStart = Date.now();
  const requiredEnvVars = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ];
  const missingEnvVars = requiredEnvVars.filter(
    (v) => !process.env[v]
  );
  checks.push({
    name: "environment",
    status: missingEnvVars.length === 0 ? "ok" : "error",
    responseTimeMs: Date.now() - envStart,
    message:
      missingEnvVars.length > 0
        ? `Missing: ${missingEnvVars.join(", ")}`
        : undefined,
  });

  // Check Supabase connection
  const dbStart = Date.now();
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();
    const { error } = await supabase
      .from("tenants")
      .select("id", { count: "exact", head: true });
    checks.push({
      name: "database",
      status: error ? "error" : "ok",
      responseTimeMs: Date.now() - dbStart,
      message: error?.message,
    });
  } catch (err) {
    checks.push({
      name: "database",
      status: "error",
      responseTimeMs: Date.now() - dbStart,
      message: err instanceof Error ? err.message : "Connection failed",
    });
  }

  // Check Supabase Auth
  const authStart = Date.now();
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();
    // Just try to get session — this tests auth service
    await supabase.auth.getSession();
    checks.push({
      name: "auth",
      status: "ok",
      responseTimeMs: Date.now() - authStart,
    });
  } catch (err) {
    checks.push({
      name: "auth",
      status: "error",
      responseTimeMs: Date.now() - authStart,
      message: err instanceof Error ? err.message : "Auth service error",
    });
  }

  // Check Supabase Storage
  const storageStart = Date.now();
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();
    const { error } = await supabase.storage.listBuckets();
    checks.push({
      name: "storage",
      status: error ? "error" : "ok",
      responseTimeMs: Date.now() - storageStart,
      message: error?.message,
    });
  } catch (err) {
    checks.push({
      name: "storage",
      status: "error",
      responseTimeMs: Date.now() - storageStart,
      message: err instanceof Error ? err.message : "Storage error",
    });
  }

  // Check AI service (just verify API key exists)
  const aiStart = Date.now();
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
  checks.push({
    name: "ai_service",
    status: hasAnthropicKey ? "ok" : "error",
    responseTimeMs: Date.now() - aiStart,
    message: hasAnthropicKey ? undefined : "ANTHROPIC_API_KEY not configured",
  });

  const hasErrors = checks.some((c) => c.status === "error");
  const allErrors = checks.every((c) => c.status === "error");

  return {
    status: allErrors ? "unhealthy" : hasErrors ? "degraded" : "healthy",
    checks,
    version: process.env.npm_package_version ?? "1.0.0",
    uptime: process.uptime(),
  };
}
