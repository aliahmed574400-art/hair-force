import { NextResponse } from "next/server";
import { getAdminDataForUser } from "@/lib/repositories";
import { getSessionFromRequest } from "@/lib/session";

export async function GET(request) {
  try {
    const user = getSessionFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const data = await getAdminDataForUser(user);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
}
