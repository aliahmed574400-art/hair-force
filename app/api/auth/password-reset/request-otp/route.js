import { NextResponse } from "next/server";
import { requestPasswordResetOtp } from "@/lib/postgres-repositories";
import { sendPasswordResetOtpEmail } from "@/lib/email";
import { checkEmailRateLimit } from "@/lib/security-middleware";

export async function POST(request) {
  try {
    const payload = await request.json();
    const email = String(payload.email || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    // SECURITY: Rate limit OTP requests per email (5 per hour)
    if (!checkEmailRateLimit(email, 5)) {
      return NextResponse.json(
        { error: "Too many OTP requests. Please try again later." },
        { status: 429 }
      );
    }

    const otpState = await requestPasswordResetOtp({ email });
    const delivery = await sendPasswordResetOtpEmail({
      to: otpState.email,
      code: otpState.code,
      expiresInSeconds: otpState.expiresIn
    });

    return NextResponse.json(
      {
        email: otpState.email,
        expiresIn: otpState.expiresIn,
        devCode:
          delivery.delivered || process.env.NODE_ENV === "production" ? undefined : otpState.code
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ error: "Failed to send OTP." }, { status: 400 });
  }
}
