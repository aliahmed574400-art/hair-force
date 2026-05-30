// CSRF NOTE: We rely on `sameSite: "strict"` on the session cookie (lib/session.js)
// rather than per-request CSRF tokens. SameSite=Strict prevents the session cookie
// from being attached to cross-origin requests, which neutralises classic CSRF.
// If we ever loosen to `sameSite: "lax"` (e.g. to support cross-origin OAuth
// callbacks), reintroduce a real double-submit CSRF token check here.

// Rate limiting strategy:
//  - If UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set, use Upstash
//    REST API (atomic INCR + EXPIRE via pipeline). This is the production path —
//    one shared counter across all serverless instances.
//  - Otherwise fall back to an in-memory Map. This is fine for local dev but
//    is per-instance on serverless, so effective limit = N × maxRequests with
//    N instances. Don't ship without Upstash configured.
//
// All exports are now async because Redis is async; callers must `await`.

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || "";
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || "";
const HAS_REDIS = Boolean(UPSTASH_URL && UPSTASH_TOKEN);

const rateLimitStore = new Map();

async function checkRateLimitMemory(key, maxRequests, windowMs) {
  const now = Date.now();
  const record = rateLimitStore.get(key) || { count: 0, resetAt: now + windowMs };

  if (now > record.resetAt) {
    record.count = 0;
    record.resetAt = now + windowMs;
  }

  record.count++;
  rateLimitStore.set(key, record);

  if (rateLimitStore.size > 10000) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetAt < now) {
        rateLimitStore.delete(k);
      }
    }
  }

  return record.count <= maxRequests;
}

async function checkRateLimitRedis(key, maxRequests, windowMs) {
  // Atomic INCR + conditional EXPIRE via Upstash pipeline.
  // The pipeline endpoint runs commands in order on the same connection.
  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
  const payload = [
    ["INCR", `ratelimit:${key}`],
    ["EXPIRE", `ratelimit:${key}`, windowSeconds, "NX"]
  ];

  try {
    const response = await fetch(`${UPSTASH_URL}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      // Don't let Redis latency take down the request — fall back to allow.
      signal: AbortSignal.timeout(2000)
    });

    if (!response.ok) {
      // On Redis error, allow the request rather than locking users out.
      // The cost of being permissive on a Redis blip is lower than a full outage.
      return true;
    }

    const results = await response.json();
    // Pipeline returns [{result: incr_value}, {result: expire_value}]
    const count = Number(results?.[0]?.result || 0);
    return count <= maxRequests;
  } catch {
    return true; // Fail open
  }
}

/**
 * Rate limit a key. Returns true if the request is allowed, false if blocked.
 * Uses Upstash Redis when configured, in-memory Map otherwise.
 * @param {string} key
 * @param {number} maxRequests
 * @param {number} windowMs
 * @returns {Promise<boolean>}
 */
export async function checkRateLimit(key, maxRequests = 5, windowMs = 60000) {
  if (HAS_REDIS) {
    return checkRateLimitRedis(key, maxRequests, windowMs);
  }
  return checkRateLimitMemory(key, maxRequests, windowMs);
}

/**
 * Get rate limit key from request (IP + path)
 * @param {Request} request
 * @returns {string}
 */
export function getRateLimitKey(request, identifier = "ip") {
  let key = "";

  if (identifier === "ip") {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "unknown";
    key = ip;
  }

  const pathname = new URL(request.url).pathname;
  return `${key}:${pathname}`;
}

/**
 * Email rate limiter — prevent OTP / signup bombing.
 * @param {string} email
 * @param {number} maxPerHour
 * @returns {Promise<boolean>}
 */
export async function checkEmailRateLimit(email, maxPerHour = 5) {
  return checkRateLimit(`email:${email}`, maxPerHour, 3600000);
}

/**
 * Booking rate limiter per vendor — prevent booking DoS.
 * @param {string} vendorSlug
 * @param {number} maxPerMinute
 * @returns {Promise<boolean>}
 */
export async function checkBookingRateLimit(vendorSlug, maxPerMinute = 10) {
  return checkRateLimit(`booking:${vendorSlug}`, maxPerMinute, 60000);
}

/**
 * Whether the distributed (Redis) limiter is configured. Useful for diagnostics.
 */
export function isDistributedRateLimiter() {
  return HAS_REDIS;
}
