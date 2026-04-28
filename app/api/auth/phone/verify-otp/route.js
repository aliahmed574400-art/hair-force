import { NextResponse } from "next/server";
import { verifyPhoneSignupOtp } from "@/lib/postgres-repositories";
import { applySessionCookie } from "@/lib/session";

export async function POST(request) {
  try {
    const payload = await request.json();
    const phone = String(payload.phone || "").trim();
    const code = String(payload.code || "").trim();

    if (!phone || !code) {
      return NextResponse.json(
        { error: "Phone number and verification code are required." },
        { status: 400 }
      );
    }

    const user = await verifyPhoneSignupOtp({ phone, code });
    const response = NextResponse.json({ user });
    await applySessionCookie(response, user, request);
    return response;
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
