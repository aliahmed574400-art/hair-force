import { NextResponse } from "next/server";
import { signupUser } from "@/lib/postgres-repositories";
import { applySessionCookie } from "@/lib/session";

export async function POST(request) {
  try {
    const payload = await request.json();
    const name = String(payload.name || "").trim();
    const email = String(payload.email || "").trim().toLowerCase();
    const password = String(payload.password || "");
    const confirmPassword = String(payload.confirmPassword || "");
    const termsAccepted = payload.termsAccepted === true;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required." },
        { status: 400 }
      );
    }

    if (confirmPassword && password !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match." },
        { status: 400 }
      );
    }

    if (!termsAccepted) {
      return NextResponse.json(
        { error: "You must accept the terms to create an account." },
        { status: 400 }
      );
    }

    const user = await signupUser({
      ...payload,
      name,
      email,
      password
    });
    const response = NextResponse.json({ user }, { status: 201 });
    await applySessionCookie(response, user, request);
    return response;
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
