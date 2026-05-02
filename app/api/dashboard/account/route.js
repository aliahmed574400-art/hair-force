import { NextResponse } from "next/server";
import { deleteUserAccount } from "@/lib/postgres-repositories";
import { clearSessionCookie, getSessionFromRequest } from "@/lib/session";

export async function DELETE(request) {
  try {
    const user = await getSessionFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    await deleteUserAccount(user);
    const response = NextResponse.json({ ok: true });
    clearSessionCookie(response);
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to delete this account." },
      { status: Number(error?.status) || 400 }
    );
  }
}
