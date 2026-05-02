import { NextResponse } from "next/server";
import { verifyPhoneSigninOtp } from "@/lib/postgres-repositories";
import { applySessionCookie } from "@/lib/session";

export async function POST(request) {
  try {
    const payload = await request.json();
    const phone = String(payload.phone || "").trim();
    const code = String(payload.code || "").trim();
    const allowedRoles = Array.isArray(payload.allowedRoles) ? payload.allowedRoles : undefined;

    if (!phone || !code) {
      return NextResponse.json(
        { error: "Phone number and verification code are required." },
        { status: 400 }
      );
    }

    const user = await verifyPhoneSigninOtp({ phone, code, allowedRoles });
    const response = NextResponse.json({ user });
    await applySessionCookie(response, user, request);
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: Number(error?.status) || 400 }
    );
  }
}
