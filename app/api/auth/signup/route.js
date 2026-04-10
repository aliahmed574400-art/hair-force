import { NextResponse } from "next/server";
import { signupUser } from "@/lib/postgres-repositories";
import { applySessionCookie } from "@/lib/session";

export async function POST(request) {
  try {
    const payload = await request.json();

    if (!payload.name || !payload.email || !payload.password) {
      return NextResponse.json(
        { error: "Name, email, and password are required." },
        { status: 400 }
      );
    }

    const user = await signupUser(payload);
    const response = NextResponse.json({ user }, { status: 201 });
    applySessionCookie(response, user);
    return response;
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
