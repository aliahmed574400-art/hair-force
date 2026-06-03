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

    await sendPasswordChangeOtpEmail({
      to: result.email,
      code: result.code,
      expiresInSeconds: result.expiresIn
    });

    return NextResponse.json({
      email: result.email,
      expiresIn: result.expiresIn,
      devCode: result.code
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to send verification code." },
      { status: 400 }
    );
  }
}
