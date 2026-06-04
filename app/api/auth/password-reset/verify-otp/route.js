import { NextResponse } from "next/server";
import { verifyPasswordResetOtp } from "@/lib/postgres-repositories";
import { checkEmailRateLimit } from "@/lib/security-middleware";

export async function POST(request) {
  try {
    const payload = await request.json();
    const email = String(payload.email || "").trim().toLowerCase();
    const code = String(payload.code || "").trim();

    if (!email || !code) {
      return NextResponse.json(
        { error: "Email and verification code are required." },
        { status: 400 }
      );
    }

    // SECURITY: Rate limit verification attempts (10 per hour)
    if (!(await checkEmailRateLimit(email, 10))) {
      return NextResponse.json(
        { error: "Too many verification attempts. Please try again later." },
        { status: 429 }
      );
    }

    const resetState = await verifyPasswordResetOtp({ email, code });

    return NextResponse.json({
      verified: true,
      email: resetState.email,
      resetToken: resetState.resetToken,
      expiresIn: resetState.expiresIn
    });
  } catch (error) {
    return NextResponse.json({ error: "Invalid or expired verification code." }, { status: 400 });
  }
}
