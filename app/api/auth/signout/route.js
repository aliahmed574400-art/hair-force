import { NextResponse } from "next/server";
import { clearSessionCookie, revokeSessionFromRequest } from "@/lib/session";

export async function POST(request) {
  await revokeSessionFromRequest(request);
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
