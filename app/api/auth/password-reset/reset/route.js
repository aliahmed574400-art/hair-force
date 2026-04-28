import { NextResponse } from "next/server";
import { resetPasswordWithToken } from "@/lib/postgres-repositories";

export async function POST(request) {
  try {
    const payload = await request.json();
    const email = String(payload.email || "").trim().toLowerCase();
    const resetToken = String(payload.resetToken || "").trim();
    const password = String(payload.password || "");
    const confirmPassword = String(payload.confirmPassword || "");

    if (!email || !resetToken || !password || !confirmPassword) {
      return NextResponse.json(
        { error: "Email, reset session, and both password fields are required." },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match." },
        { status: 400 }
      );
    }

    await resetPasswordWithToken({ email, resetToken, password });

    return NextResponse.json({
      success: true,
      email
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
