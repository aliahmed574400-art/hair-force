import { NextResponse } from "next/server";
import { requestPhoneSigninOtp } from "@/lib/postgres-repositories";

export async function POST(request) {
  try {
    const payload = await request.json();
    const phone = String(payload.phone || "").trim();
    const allowedRoles = Array.isArray(payload.allowedRoles) ? payload.allowedRoles : undefined;

    if (!phone) {
      return NextResponse.json(
        { error: "Phone number is required." },
        { status: 400 }
      );
    }

    const otpState = await requestPhoneSigninOtp({ phone, allowedRoles });
    return NextResponse.json(otpState, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: Number(error?.status) || 400 }
    );
  }
}
