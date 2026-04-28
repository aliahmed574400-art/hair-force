import { NextResponse } from "next/server";
import {
  addFavoriteStylist,
  getDashboardDataForUser
} from "@/lib/postgres-repositories";
import { getSessionFromRequest } from "@/lib/session";

export async function GET(request) {
  const user = await getSessionFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const dashboard = await getDashboardDataForUser(user);
  return NextResponse.json({ favorites: dashboard?.favorites || [] });
}

export async function POST(request) {
  try {
    const user = await getSessionFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const payload = await request.json();
    const dashboard = await addFavoriteStylist(user, payload.vendorSlug);
    return NextResponse.json(dashboard);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
