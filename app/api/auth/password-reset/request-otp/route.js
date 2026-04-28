import { NextResponse } from "next/server";
import { requestPasswordResetOtp } from "@/lib/postgres-repositories";
import { sendPasswordResetOtpEmail } from "@/lib/email";

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
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
