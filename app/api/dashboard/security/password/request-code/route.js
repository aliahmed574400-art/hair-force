import { NextResponse } from "next/server";
import { requestPasswordChangeCode } from "@/lib/postgres-repositories";
import { getSessionFromRequest } from "@/lib/session";
import { sendPasswordChangeOtpEmail } from "@/lib/email";

export async function POST(request) {
  try {
    const user = await getSessionFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const result = await requestPasswordChangeCode(user);

    try {
      await sendPasswordChangeOtpEmail({
        to: result.email,
        code: result.code,
        expiresInSeconds: result.expiresIn
      });
    } catch (emailError) {
      console.error("[Email] Failed to send password change OTP:", emailError);
      if (process.env.NODE_ENV === "production") {
        throw emailError;
      }
    }

    return NextResponse.json({
      email: result.email,
      expiresIn: result.expiresIn
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to send verification code." },
      { status: 400 }
    );
  }
}
