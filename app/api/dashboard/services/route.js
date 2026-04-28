import { NextResponse } from "next/server";
import { createVendorService, getDashboardDataForUser } from "@/lib/postgres-repositories";
import { getSessionFromRequest } from "@/lib/session";

export async function GET(request) {
  const user = await getSessionFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const dashboard = await getDashboardDataForUser(user);
  return NextResponse.json(dashboard);
}

export async function POST(request) {
  try {
    const user = await getSessionFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const payload = await request.json();
    const dashboard = await createVendorService(user, payload);
    return NextResponse.json(dashboard, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
