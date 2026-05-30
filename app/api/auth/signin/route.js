import { NextResponse } from "next/server";
import { signinUser } from "@/lib/postgres-repositories";
import { applySessionCookie } from "@/lib/session";
import { checkRateLimit, getRateLimitKey } from "@/lib/security-middleware";

export async function POST(request) {
  try {
    const payload = await request.json();

    if (!payload.email || !payload.password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const email = String(payload.email || "").trim().toLowerCase();
    
    // SECURITY: Rate limit sign-in attempts (10 per hour per email)
    const rateLimitKey = `signin:${email}`;
    if (!(await checkRateLimit(rateLimitKey, 10, 3600000))) {
      return NextResponse.json(
        { error: "Too many sign-in attempts. Please try again later." },
        { status: 429 }
      );
    }

    const user = await signinUser(payload);
    const response = NextResponse.json({ user });
    await applySessionCookie(response, user, request);
    return response;
  } catch (error) {
    // SECURITY: Don't expose whether email exists or password is wrong (prevents user enumeration)
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 }
    );
  }
}
