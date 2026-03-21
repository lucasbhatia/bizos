// ============================================================================
// Simple in-memory rate limiter
// ============================================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store — resets on server restart
// For production, use Redis or similar
const store = new Map<string, RateLimitEntry>();

// Periodic cleanup to prevent memory leaks
const CLEANUP_INTERVAL_MS = 60_000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  const keys = Array.from(store.keys());
  for (const key of keys) {
    const entry = store.get(key);
    if (entry && entry.resetAt < now) {
      store.delete(key);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
}

/**
 * Check if a request should be rate-limited.
 *
 * @param key — Unique identifier (e.g., IP address, user ID, route)
 * @param maxRequests — Maximum requests allowed in the window
 * @param windowMs — Time window in milliseconds
 * @returns Rate limit result with remaining quota
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  cleanup();

  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    // New window
    const newEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + windowMs,
    };
    store.set(key, newEntry);
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: newEntry.resetAt,
      limit: maxRequests,
    };
  }

  // Existing window
  entry.count++;

  if (entry.count > maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      limit: maxRequests,
    };
  }

  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetAt: entry.resetAt,
    limit: maxRequests,
  };
}

/**
 * Apply rate limit headers to a Response or NextResponse
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}
