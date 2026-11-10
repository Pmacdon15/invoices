/*
 * Fixed-window rate limits for the MCP endpoint, kept in memory. Each
 * request makes several Clerk API calls, so a runaway client or a flood of
 * junk tokens is capped per user and per IP. The count lives in one
 * serverless instance, so the cap is per instance: enough to stop a loop, not
 * a guarantee across the whole deployment.
 */

export type RateLimit = {
  name: string;
  limit: number;
  windowSeconds: number;
};

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number };

/** MCP requests per signed-in user. */
export const MCP_REQUEST_LIMIT: RateLimit = {
  name: "mcp",
  limit: 120,
  windowSeconds: 60,
};

/** Requests carrying a bearer token, per client IP, before it's verified. */
export const MCP_PREAUTH_IP_LIMIT: RateLimit = {
  name: "mcp-ip",
  limit: 300,
  windowSeconds: 60,
};

/** Windows kept before the oldest are dropped, so memory stays bounded. */
const MAX_KEYS = 10_000;

const windows = new Map<string, { start: number; count: number }>();

/** Counts one request for `key` under `limit`. */
export function checkRateLimit(
  limit: RateLimit,
  key: string,
  now = Date.now(),
): RateLimitResult {
  const id = `${limit.name}:${key}`;
  const windowMs = limit.windowSeconds * 1000;
  const current = windows.get(id);

  if (!current || now - current.start >= windowMs) {
    if (windows.size >= MAX_KEYS) {
      const oldest = windows.keys().next().value as string;
      windows.delete(oldest);
    }
    windows.set(id, { start: now, count: 1 });
    return { ok: true };
  }

  if (current.count >= limit.limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((current.start + windowMs - now) / 1000),
      ),
    };
  }
  current.count += 1;
  return { ok: true };
}

/** Forgets every window (tests). */
export function resetRateLimits() {
  windows.clear();
}
