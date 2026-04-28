import { NextResponse } from "next/server";
import { verifyPasswordResetOtp } from "@/lib/postgres-repositories";

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

    const resetState = await verifyPasswordResetOtp({ email, code });
    return NextResponse.json(resetState);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
