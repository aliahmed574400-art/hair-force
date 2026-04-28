import crypto from "crypto";
import { cookies } from "next/headers";
import {
  createAuthSession,
  getUserByAuthSession,
  revokeAuthSession,
  SESSION_MAX_AGE_SECONDS
} from "@/lib/postgres-repositories";

const SESSION_COOKIE = "hairforce_session";
const SESSION_SECRET = process.env.SESSION_SECRET || "hairforce-dev-session-secret";

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
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
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
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}
