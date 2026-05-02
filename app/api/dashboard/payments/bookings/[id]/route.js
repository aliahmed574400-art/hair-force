import { NextResponse } from "next/server";
import { payClientBooking } from "@/lib/postgres-repositories";
import { getSessionFromRequest } from "@/lib/session";

export async function POST(request, { params }) {
  try {
    const user = await getSessionFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    // SECURITY: Verify amount is positive
    const payload = await request.json();
    const amount = Number(payload.amount || 0);
    if (amount <= 0 || isNaN(amount)) {
      return NextResponse.json({ error: "Invalid payment amount." }, { status: 400 });
    }

    const dashboard = await payClientBooking(user, params.id, payload);
    return NextResponse.json(dashboard);
  } catch (error) {
    return NextResponse.json({ error: "Failed to process payment." }, { status: 400 });
  }
}
