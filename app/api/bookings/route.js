import { NextResponse } from "next/server";
import { createBooking } from "@/lib/repositories";
import { getSessionFromRequest } from "@/lib/session";

export async function POST(request) {
  try {
    const payload = await request.json();
    const sessionUser = getSessionFromRequest(request);

    const requiredFields = [
      "vendorSlug",
      "serviceId",
      "serviceName",
      "appointmentDate",
      "appointmentSlot",
      "customerName",
      "customerEmail",
      "total"
    ];

    for (const field of requiredFields) {
      if (!payload[field]) {
        return NextResponse.json({ error: `${field} is required.` }, { status: 400 });
      }
    }

    const booking = await createBooking({
      ...payload,
      customerId: payload.customerId || sessionUser?.id || null,
      customerEmail: payload.customerEmail || sessionUser?.email,
      customerName: payload.customerName || sessionUser?.name
    });
    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
