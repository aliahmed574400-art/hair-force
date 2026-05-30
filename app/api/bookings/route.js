import { NextResponse } from "next/server";
import { createBooking } from "@/lib/postgres-repositories";
import { getSessionFromRequest } from "@/lib/session";

export async function POST(request) {
  try {
    const sessionUser = await getSessionFromRequest(request);

    // SECURITY: Booking requires sign-in. Anonymous booking creation is rejected
    // so attackers cannot submit bookings using other people's emails or spam vendors.
    if (!sessionUser) {
      return NextResponse.json(
        { error: "Sign in to book an appointment." },
        { status: 401 }
      );
    }

    const payload = await request.json();

    const requiredFields = [
      "vendorSlug",
      "serviceId",
      "serviceName",
      "appointmentDate",
      "appointmentSlot",
      "total"
    ];

    for (const field of requiredFields) {
      if (!payload[field]) {
        return NextResponse.json({ error: `${field} is required.` }, { status: 400 });
      }
    }

    // SECURITY: Validate the amount is positive
    const total = Number(payload.total || 0);
    if (isNaN(total) || total < 0) {
      return NextResponse.json({ error: "Invalid booking amount." }, { status: 400 });
    }

    // SECURITY: Force the booking identity to come from the session, not the payload.
    // Admins are still allowed to book on behalf of another email.
    const sessionEmail = String(sessionUser.email || "").toLowerCase().trim();
    const payloadEmail = String(payload.customerEmail || "").toLowerCase().trim();
    const isAdminOverride = sessionUser.role === "admin" && payloadEmail && payloadEmail !== sessionEmail;

    const booking = await createBooking({
      ...payload,
      customerId: isAdminOverride ? (payload.customerId || null) : sessionUser.id,
      customerEmail: isAdminOverride ? payloadEmail : sessionEmail,
      customerName: isAdminOverride ? (payload.customerName || sessionUser.name) : sessionUser.name
    });
    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create booking." }, { status: 400 });
  }
}
