import { getAuthSessionsRepository } from "@/lib/repository/auth-sessions";
import { SESSION_MAX_AGE_SECONDS } from "@/lib/session-constants";
import { createSignedSessionToken, verifySessionToken } from "./session-token.js";

const authSessions = getAuthSessionsRepository();

const SESSION_COOKIE = "hairforce_session";

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
  const { cookies } = await import("next/headers");
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
