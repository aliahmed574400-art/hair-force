import { NextResponse } from "next/server";
import { changeClientPassword } from "@/lib/postgres-repositories";
import { getSessionFromRequest } from "@/lib/session";

export async function POST(request) {
  try {
    const user = await getSessionFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const payload = await request.json();
    const updatedUser = await changeClientPassword(user, payload);
    return NextResponse.json({ user: updatedUser, success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
