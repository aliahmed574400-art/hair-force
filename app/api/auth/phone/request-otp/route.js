import { NextResponse } from "next/server";
import { requestPhoneSignupOtp } from "@/lib/postgres-repositories";

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

    const otpState = await requestPhoneSignupOtp({ phone });
    return NextResponse.json(otpState, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
