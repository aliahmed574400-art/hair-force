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
    if (!(await checkEmailRateLimit(email, 5))) {
      return NextResponse.json(
        { error: "Too many OTP requests. Please try again later." },
        { status: 429 }
      );
    }

    const otpState = await requestPasswordResetOtp({ email });

    try {
      await sendPasswordResetOtpEmail({
        to: otpState.email,
        code: otpState.code,
        expiresInSeconds: otpState.expiresIn
      });
    } catch (emailError) {
      console.error("[Email] Failed to send password reset OTP:", emailError);
      if (process.env.NODE_ENV === "production") {
        throw emailError;
      }
    }

    return NextResponse.json(
      {
        email: otpState.email,
        expiresIn: otpState.expiresIn,
        devCode: process.env.NODE_ENV === "production" ? undefined : otpState.code
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[OTP Error]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to send OTP." }, { status: 400 });
  }
}
