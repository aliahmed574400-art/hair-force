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
      const value = payload[field];
      if (value === undefined || value === null || value === "") {
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

    const sessionName = String(sessionUser.name || "").trim();
    const payloadName = String(payload.customerName || "").trim();
    const customerName = isAdminOverride ? (payloadName || sessionName) : (sessionName || payloadName);

    if (!customerName) {
      return NextResponse.json(
        { error: "Please enter your name before booking." },
        { status: 400 }
      );
    }

    const booking = await createBooking({
      ...payload,
      customerId: isAdminOverride ? (payload.customerId || null) : sessionUser.id,
      customerEmail: isAdminOverride ? payloadEmail : sessionEmail,
      customerName
    });
    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    const message = error?.message || "Failed to create booking.";
    console.error("[POST /api/bookings] error:", message, error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
