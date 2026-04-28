import { NextResponse } from "next/server";
import { getVendorBookingAvailability } from "@/lib/postgres-repositories";
import { getSessionFromRequest } from "@/lib/session";

export async function GET(request, { params }) {
  try {
    const user = await getSessionFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const availability = await getVendorBookingAvailability(user, params.id);
    return NextResponse.json(availability);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
