import { NextResponse } from "next/server";
import {
  cancelClientBooking,
  rescheduleClientBooking
} from "@/lib/postgres-repositories";
import { getSessionFromRequest } from "@/lib/session";

export async function PATCH(request, { params }) {
  try {
    const user = await getSessionFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const payload = await request.json();

    if (payload.action === "cancel") {
      const booking = await cancelClientBooking(user, params.id, payload);
      return NextResponse.json({ booking });
    }

    if (payload.action === "reschedule") {
      const booking = await rescheduleClientBooking(user, params.id, payload);
      return NextResponse.json({ booking });
    }

    return NextResponse.json({ error: "Unsupported booking action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
