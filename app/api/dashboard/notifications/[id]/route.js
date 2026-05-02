import { NextResponse } from "next/server";
import {
  markClientNotificationRead,
  markVendorNotificationRead
} from "@/lib/postgres-repositories";
import { getSessionFromRequest } from "@/lib/session";

export async function PATCH(request, { params }) {
  try {
    const user = await getSessionFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const notification =
      user.role === "vendor"
        ? await markVendorNotificationRead(user, params.id)
        : await markClientNotificationRead(user, params.id);
    return NextResponse.json({ notification });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
