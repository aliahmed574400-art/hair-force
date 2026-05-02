import { NextResponse } from "next/server";
import { createBooking, getUserByEmail } from "@/lib/postgres-repositories";
import { getSessionFromRequest } from "@/lib/session";

export async function POST(request) {
  try {
    const payload = await request.json();
    const sessionUser = await getSessionFromRequest(request);

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

    // SECURITY: Validate the amount is positive
    const total = Number(payload.total || 0);
    if (isNaN(total) || total < 0) {
      return NextResponse.json({ error: "Invalid booking amount." }, { status: 400 });
    }

    // SECURITY: If a specific customer email is provided, verify it matches the session user
    // Only allow users to book for themselves unless they have explicit permission
    if (payload.customerEmail && sessionUser) {
      const customerEmail = String(payload.customerEmail || "").toLowerCase().trim();
      const sessionEmail = String(sessionUser.email || "").toLowerCase().trim();
      
      // If emails don't match and user is not admin, reject the request
      if (customerEmail !== sessionEmail && sessionUser.role !== "admin") {
        return NextResponse.json(
          { error: "You can only create bookings for your own email address." },
          { status: 403 }
        );
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
    return NextResponse.json({ error: "Failed to create booking." }, { status: 400 });
  }
}
