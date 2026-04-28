import { NextResponse } from "next/server";
import { signinUser } from "@/lib/postgres-repositories";
import { applySessionCookie } from "@/lib/session";

export async function POST(request) {
  try {
    const payload = await request.json();

    if (!payload.email || !payload.password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const user = await signinUser(payload);
    const response = NextResponse.json({ user });
    await applySessionCookie(response, user, request);
    return response;
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
