import { NextResponse } from "next/server";
import { updateVendorBooking } from "@/lib/postgres-repositories";
import { getSessionFromRequest } from "@/lib/session";

export async function PATCH(request, { params }) {
  try {
    const user = await getSessionFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const payload = await request.json();
    const dashboard = await updateVendorBooking(user, params.id, payload);
    return NextResponse.json(dashboard);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
