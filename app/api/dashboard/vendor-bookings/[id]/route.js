import { NextResponse } from "next/server";
import { updateVendorBooking } from "@/lib/postgres-repositories";
import { getSessionFromRequest } from "@/lib/session";

export async function PATCH(request, { params }) {
  try {
    const user = await getSessionFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    // SECURITY: Verify vendor owns this booking
    if (user.role !== "vendor") {
      return NextResponse.json({ error: "Only vendors can update bookings." }, { status: 403 });
    }

    const payload = await request.json();
    const dashboard = await updateVendorBooking(user, params.id, payload);
    return NextResponse.json(dashboard);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update booking." }, { status: 400 });
  }
}
