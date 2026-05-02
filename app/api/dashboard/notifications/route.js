import { NextResponse } from "next/server";
import {
  getDashboardDataForUser,
  markAllClientNotificationsRead,
  markAllVendorNotificationsRead
} from "@/lib/postgres-repositories";
import { getSessionFromRequest } from "@/lib/session";

export async function GET(request) {
  const user = await getSessionFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const dashboard = await getDashboardDataForUser(user);
  return NextResponse.json({
    notifications: dashboard?.notifications || [],
    unreadNotificationCount: dashboard?.unreadNotificationCount || 0
  });
}

export async function PATCH(request) {
  try {
    const user = await getSessionFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const payload = await request.json();

    if (payload.action !== "markAllRead") {
      return NextResponse.json({ error: "Unsupported notification action." }, { status: 400 });
    }

    const dashboard =
      user.role === "vendor"
        ? await markAllVendorNotificationsRead(user)
        : await markAllClientNotificationsRead(user);
    return NextResponse.json(dashboard);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
