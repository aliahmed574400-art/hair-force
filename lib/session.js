import crypto from "crypto";
import { cookies } from "next/headers";
import {
  createAuthSession,
  getUserByAuthSession,
  revokeAuthSession,
  SESSION_MAX_AGE_SECONDS
} from "@/lib/postgres-repositories";

const SESSION_COOKIE = "hairforce_session";

// Generate or load session secret
function getSessionSecret() {
  const envSecret = process.env.SESSION_SECRET;
  if (!envSecret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "SESSION_SECRET environment variable is required in production. " +
        "Generate a 64-byte random string: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\""
      );
    }
    // Development: generate random secret (changes on each restart - warn about this)
    console.warn("\n⚠️  WARNING: SESSION_SECRET not set. Generating random secret for development.");
    console.warn("   Sessions will be invalidated on server restart.\n");
    return crypto.randomBytes(64).toString('hex');
  }
  
  // Validate secret is at least 32 bytes (64 hex chars)
  if (envSecret.length < 64) {
    throw new Error(
      "SESSION_SECRET must be at least 64 hex characters (32 bytes). " +
      "Generate one with: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\""
    );
  }
  return envSecret;
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

  return getUserByAuthSession(payload.sessionId, payload.verifier);
}

export async function getSessionFromRequest(request) {
  const token = request?.cookies?.get(SESSION_COOKIE)?.value || "";
  const payload = verifySessionToken(token);

  if (!payload) {
    return null;
  }

  return getUserByAuthSession(payload.sessionId, payload.verifier);
}

export async function getSessionFromServer() {
  const cookieStore = await cookies();
  return getSessionFromCookieStore(cookieStore);
}

export async function applySessionCookie(response, user, request) {
  const session = await createAuthSession(user, {
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

  return revokeAuthSession(currentUser, currentUser.sessionId);
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
