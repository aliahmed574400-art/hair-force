import { NextResponse } from "next/server";
import { requestPhoneSignupOtp } from "@/lib/postgres-repositories";
import { checkRateLimit, getRateLimitKey } from "@/lib/security-middleware";

export async function POST(request) {
  try {
    const payload = await request.json();
    const phone = String(payload.phone || "").trim();

    if (!phone) {
      return NextResponse.json(
        { error: "Phone number is required." },
        { status: 400 }
      );
    }

    // SECURITY: Rate limit OTP requests per phone (5 per hour)
    const rateLimitKey = `phone:${phone}`;
    if (!checkRateLimit(rateLimitKey, 5, 3600000)) {
      return NextResponse.json(
        { error: "Too many OTP requests. Please try again later." },
        { status: 429 }
      );
    }

    const otpState = await requestPhoneSignupOtp({ phone });
    return NextResponse.json(otpState, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to send OTP." }, { status: 400 });
  }
}
