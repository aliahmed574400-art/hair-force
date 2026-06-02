import { createHash } from "crypto";
import { Pool } from "pg";
import { verifySessionToken } from "./session-token.js";

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
let pool = null;

function getPool() {
  if (!pool && DATABASE_URL) {
    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: !/localhost|127\.0\.0\.1/i.test(DATABASE_URL) ? { rejectUnauthorized: false } : false
    });
  }
  return pool;
}

function hashOpaqueToken(token, scope) {
  const secret = process.env.SESSION_SECRET || "hairforce-dev-session-secret";
  return createHash("sha256")
    .update(`${scope}:${token}:${secret}`)
    .digest("hex");
}

function mapUserRow(row) {
  if (!row) return null;
  const user = {
    id: row.id,
    name: row.name || "",
    email: row.email || "",
    phone: row.phone || "",
    city: row.city || "",
    vendorSlug: row.vendor_slug || "",
    role: row.role || "client",
    avatar: row.avatar || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    timezone: row.timezone || "America/Los_Angeles",
    country: row.country || "US",
    phoneNormalized: row.phone_normalized || "",
    phoneCountryCode: row.phone_country_code || "+1",
    smsOptIn: row.sms_opt_in || false,
    promoCode: row.promo_code || "",
    reducedMotion: row.reduced_motion || false,
    highContrast: row.high_contrast || false,
    largerText: row.larger_text || false,
    lastSigninAt: row.last_signin_at,
    signinCount: row.signin_count || 0,
    googleId: row.google_id || "",
    appleId: row.apple_id || ""
  };
  // Strip phone-placeholder emails for privacy
  if (user.email && user.email.startsWith("phone-")) {
    user.email = "";
  }
  return user;
}

export async function findUserBySession(sessionId, verifier) {
  if (!DATABASE_URL) {
    return null;
  }

  const sessionKey = String(sessionId || "").trim();
  const verifierValue = String(verifier || "").trim();

  if (!sessionKey || !verifierValue) {
    return null;
  }

  const tokenHash = hashOpaqueToken(verifierValue, "auth-session");
  const db = getPool();

  if (!db) {
    return null;
  }

  try {
    const result = await db.query(
      `
        SELECT
          users.id,
          users.name,
          users.email,
          users.phone,
          users.city,
          users.vendor_slug,
          users.role,
          users.avatar,
          users.created_at,
          users.updated_at,
          users.timezone,
          users.country,
          users.phone_normalized,
          users.phone_country_code,
          users.sms_opt_in,
          users.promo_code,
          users.reduced_motion,
          users.high_contrast,
          users.larger_text,
          users.last_signin_at,
          users.signin_count,
          users.google_id,
          users.apple_id,
          auth_sessions.id AS auth_session_id
        FROM auth_sessions
        INNER JOIN users ON users.id = auth_sessions.user_id
        WHERE auth_sessions.id = $1
          AND auth_sessions.token_hash = $2
          AND auth_sessions.revoked_at IS NULL
          AND auth_sessions.expires_at > NOW()
        LIMIT 1
      `,
      [sessionKey, tokenHash]
    );

    const row = result.rows[0];

    if (!row) {
      return null;
    }

    const user = mapUserRow(row);
    user.sessionId = row.auth_session_id;
    return user;
  } catch (error) {
    console.error("Socket auth database error:", error.message);
    return null;
  }
}

export async function authenticateSocket(handshake) {
  try {
    const cookieHeader = handshake.headers.cookie || "";
    const cookies = {};
    cookieHeader.split(";").forEach((cookie) => {
      const [name, ...rest] = cookie.trim().split("=");
      if (name) cookies[name] = decodeURIComponent(rest.join("="));
    });

    const token = cookies["hairforce_session"] || "";
    const payload = verifySessionToken(token);

    if (!payload) {
      return null;
    }

    return await findUserBySession(payload.sessionId, payload.verifier);
  } catch (error) {
    console.error("Socket authentication error:", error.message);
    return null;
  }
}
