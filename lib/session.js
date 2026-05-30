import crypto from "crypto";
import fs from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import { getAuthSessionsRepository } from "@/lib/repository/auth-sessions";
import { SESSION_MAX_AGE_SECONDS } from "@/lib/session-constants";

const authSessions = getAuthSessionsRepository();

const SESSION_COOKIE = "hairforce_session";
const DEV_SECRET_PATH = path.join(process.cwd(), ".dev-session-secret");

// Generate or load session secret
function getSessionSecret() {
  const envSecret = process.env.SESSION_SECRET;

  if (envSecret) {
    // Validate secret is at least 32 bytes (64 hex chars)
    if (envSecret.length < 64) {
      throw new Error(
        "SESSION_SECRET must be at least 64 hex characters (32 bytes). " +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\""
      );
    }
    return envSecret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET environment variable is required in production. " +
      "Generate a 64-byte random string: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\""
    );
  }

  // Development: persist a generated secret to .dev-session-secret so logins
  // survive `npm run dev` restarts. The file is gitignored and only used in dev.
  try {
    if (fs.existsSync(DEV_SECRET_PATH)) {
      const cached = fs.readFileSync(DEV_SECRET_PATH, "utf8").trim();
      if (cached.length >= 64) {
        return cached;
      }
    }
  } catch {
    // fall through to regenerate
  }

  const generated = crypto.randomBytes(64).toString("hex");
  try {
    fs.writeFileSync(DEV_SECRET_PATH, generated, { mode: 0o600 });
    console.warn("\n⚠️  WARNING: SESSION_SECRET not set. Generated dev secret in .dev-session-secret.");
    console.warn("   This is for local development only. Production requires SESSION_SECRET.\n");
  } catch {
    console.warn("\n⚠️  WARNING: SESSION_SECRET not set and could not write .dev-session-secret.");
    console.warn("   Sessions will be invalidated on server restart.\n");
  }
  return generated;
}

const SESSION_SECRET = getSessionSecret();

function encodeBase64Url(value) {
  return Buffer.from(value).toString("base64url");
}

function decodeBase64Url(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value) {
  return crypto.createHmac("sha256", SESSION_SECRET).update(value).digest("base64url");
}

function createCookiePayload(sessionId, verifier) {
  return {
    sessionId: String(sessionId || "").trim(),
    verifier: String(verifier || "").trim()
  };
}

function createSignedSessionToken(sessionId, verifier) {
  const payload = JSON.stringify(createCookiePayload(sessionId, verifier));
  const encoded = encodeBase64Url(payload);
  return `${encoded}.${sign(encoded)}`;
}

function verifySessionToken(token) {
  if (!token || !token.includes(".")) {
    return null;
  }

  const [encoded, signature] = token.split(".");

  if (!encoded || !signature || sign(encoded) !== signature) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(encoded));
    const sessionId = String(payload.sessionId || "").trim();
    const verifier = String(payload.verifier || "").trim();

    if (!sessionId || !verifier) {
      return null;
    }

    return {
      sessionId,
      verifier
    };
  } catch {
    return null;
  }
}

function getRequestIpAddress(request) {
  const forwarded = request?.headers?.get("x-forwarded-for") || "";
  return String(forwarded.split(",")[0] || request?.headers?.get("x-real-ip") || "").trim();
}

function getSessionCookieValueFromStore(cookieStore) {
  return cookieStore?.get?.(SESSION_COOKIE)?.value || "";
}

export async function getSessionFromCookieStore(cookieStore) {
  const token = getSessionCookieValueFromStore(cookieStore);
  const payload = verifySessionToken(token);

  if (!payload) {
    return null;
  }

  return authSessions.findUserBySession(payload.sessionId, payload.verifier);
}

export async function getSessionFromRequest(request) {
  const token = request?.cookies?.get(SESSION_COOKIE)?.value || "";
  const payload = verifySessionToken(token);

  if (!payload) {
    return null;
  }

  return authSessions.findUserBySession(payload.sessionId, payload.verifier);
}

export async function getSessionFromServer() {
  const cookieStore = await cookies();
  return getSessionFromCookieStore(cookieStore);
}

export async function applySessionCookie(response, user, request) {
  const session = await authSessions.createSession(user, {
    userAgent: request?.headers?.get("user-agent") || "",
    ipAddress: getRequestIpAddress(request)
  });

  response.cookies.set({
    name: SESSION_COOKIE,
    value: createSignedSessionToken(session.id, session.verifier),
    httpOnly: true,
    sameSite: "strict",
    secure: true,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS
  });
}

export async function revokeSessionFromRequest(request) {
  const currentUser = await getSessionFromRequest(request);

  if (!currentUser?.sessionId) {
    return null;
  }

  return authSessions.revokeSession(currentUser, currentUser.sessionId);
}

export function clearSessionCookie(response) {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "strict",
    secure: true,
    path: "/",
    maxAge: 0
  });
}
