import { NextResponse } from "next/server";
import { updateVendorAvailability } from "@/lib/postgres-repositories";
import { getSessionFromRequest } from "@/lib/session";

export async function PUT(request) {
  try {
    const user = await getSessionFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    // SECURITY: Only vendors can update availability
    if (user.role !== "vendor") {
      return NextResponse.json({ error: "Only vendors can update availability." }, { status: 403 });
    }

    const payload = await request.json();
    const dashboard = await updateVendorAvailability(user, payload);
    return NextResponse.json(dashboard);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update availability." }, { status: 400 });
  }
}
