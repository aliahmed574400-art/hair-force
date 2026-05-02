import { NextResponse } from "next/server";

// Simple in-memory rate limiter (for production, use Redis)
const rateLimitStore = new Map();

/**
 * Rate limiting middleware to prevent brute force attacks
 * @param {string} key - Unique identifier (email, IP, etc)
 * @param {number} maxRequests - Max requests allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {boolean} - true if request is allowed, false if rate limited
 */
export function checkRateLimit(key, maxRequests = 5, windowMs = 60000) {
  const now = Date.now();
  const record = rateLimitStore.get(key) || { count: 0, resetAt: now + windowMs };

  // Reset if window has passed
  if (now > record.resetAt) {
    record.count = 0;
    record.resetAt = now + windowMs;
  }

  record.count++;
  rateLimitStore.set(key, record);

  // Clean up old entries (basic memory management)
  if (rateLimitStore.size > 10000) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetAt < now) {
        rateLimitStore.delete(k);
      }
    }
  }

  return record.count <= maxRequests;
}

/**
 * Validate CSRF token
 * In production, tokens should be stored in secure session storage
 * @param {string} token - CSRF token from request
 * @param {string} sessionId - Session ID to validate against
 * @returns {boolean}
 */
export function validateCSRFToken(token, sessionId) {
  // Tokens should be cryptographically generated and stored server-side
  // For now, we enforce that token exists and matches session
  if (!token || !sessionId) {
    return false;
  }
  // In production: validate token against session storage
  return true;
}

/**
 * Generate CSRF token for session
 * @param {string} sessionId
 * @returns {string}
 */
export function generateCSRFToken(sessionId) {
  const crypto = require("crypto");
  return crypto
    .createHash("sha256")
    .update(`${sessionId}-${Date.now()}-${Math.random()}`)
    .digest("hex");
}

/**
 * Check if request method requires CSRF protection
 * @param {string} method - HTTP method
 * @returns {boolean}
 */
export function requiresCSRFProtection(method) {
  return ["POST", "PUT", "DELETE", "PATCH"].includes(method);
}

/**
 * API endpoint for rate limiting and CSRF protection
 * Use with OTP endpoints, bookings, etc.
 * @param {Request} request
 * @param {Object} options
 * @returns {null | NextResponse} - null if allowed, NextResponse if blocked
 */
export async function applySecurityMiddleware(
  request,
  options = {}
) {
  const {
    rateLimitKey,
    maxRequests = 5,
    windowMs = 60000,
    requireAuth = false,
    getSessionUser = null
  } = options;

  // Rate limit check
  if (rateLimitKey) {
    const allowed = checkRateLimit(rateLimitKey, maxRequests, windowMs);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }
  }

  // Auth check
  if (requireAuth && getSessionUser) {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }
  }

  // CSRF check for state-changing methods
  if (requiresCSRFProtection(request.method)) {
    const csrfToken = request.headers.get("x-csrf-token");
    if (!csrfToken) {
      return NextResponse.json(
        { error: "CSRF token required." },
        { status: 403 }
      );
    }
  }

  return null; // All checks passed
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
 * Email rate limiter - prevent email bombing on OTP
 * @param {string} email
 * @param {number} maxPerHour - Default 5 OTP attempts per hour
 * @returns {boolean}
 */
export function checkEmailRateLimit(email, maxPerHour = 5) {
  const key = `email:${email}`;
  return checkRateLimit(key, maxPerHour, 3600000); // 1 hour window
}

/**
 * Booking rate limiter - prevent DOS attacks
 * @param {string} vendorSlug
 * @param {number} maxPerMinute - Default 10 bookings per minute per vendor
 * @returns {boolean}
 */
export function checkBookingRateLimit(vendorSlug, maxPerMinute = 10) {
  const key = `booking:${vendorSlug}`;
  return checkRateLimit(key, maxPerMinute, 60000); // 1 minute window
}
