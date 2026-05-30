import { NextResponse } from "next/server";
import {
  getDashboardDataForUser,
  updateDashboardNotificationPreferences
} from "@/lib/postgres-repositories";
import { getSessionFromRequest } from "@/lib/session";

export async function GET(request) {
  const user = await getSessionFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const dashboard = await getDashboardDataForUser(user);
  return NextResponse.json({ preferences: dashboard?.notificationPreferences || null });
}

export async function PUT(request) {
  try {
    const user = await getSessionFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const payload = await request.json();
    const preferences = await updateDashboardNotificationPreferences(user, payload);
    return NextResponse.json({ preferences });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
