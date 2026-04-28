import { NextResponse } from "next/server";
import {
  getDashboardDataForUser,
  updateClientProfile,
  updateVendorProfile
} from "@/lib/postgres-repositories";
import { getSessionFromRequest } from "@/lib/session";

export async function GET(request) {
  const user = await getSessionFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const dashboard = await getDashboardDataForUser(user);
  return NextResponse.json(dashboard);
}

export async function PUT(request) {
  try {
    const user = await getSessionFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const payload = await request.json();

    if (user.role === "client") {
      const updatedUser = await updateClientProfile(user, payload);
      return NextResponse.json({ user: updatedUser });
    }

    const dashboard = await updateVendorProfile(user, payload);
    return NextResponse.json(dashboard);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
