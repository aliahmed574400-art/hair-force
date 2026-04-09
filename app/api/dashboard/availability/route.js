import { NextResponse } from "next/server";
import { updateVendorAvailability } from "@/lib/repositories";
import { getSessionFromRequest } from "@/lib/session";

export async function PUT(request) {
  try {
    const user = getSessionFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const payload = await request.json();
    const dashboard = await updateVendorAvailability(user, payload);
    return NextResponse.json(dashboard);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
