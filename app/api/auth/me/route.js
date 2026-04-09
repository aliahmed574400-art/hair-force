import { NextResponse } from "next/server";
import { getUserById } from "@/lib/repositories";
import { getSessionFromRequest } from "@/lib/session";

export async function GET(request) {
  const sessionUser = getSessionFromRequest(request);

  if (!sessionUser) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const user = (await getUserById(sessionUser.id)) || sessionUser;
  return NextResponse.json({ user });
}
