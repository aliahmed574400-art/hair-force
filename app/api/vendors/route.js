import { NextResponse } from "next/server";
import { createVendorAccount } from "@/lib/postgres-repositories";
import { applySessionCookie } from "@/lib/session";
import { SPECIALTY_OPTIONS } from "@/lib/vendor-join-wizard";

export async function GET() {
  return NextResponse.json({
    categories: ["Salon", "Barber", "Spa", "Makeup", "Nails", "Braids"],
    specialties: SPECIALTY_OPTIONS
  });
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const hasAccountFirstShape = payload.firstName !== undefined || payload.lastName !== undefined;

    if (hasAccountFirstShape) {
      if (!payload.firstName || !payload.lastName || !payload.email || !payload.password || !payload.phone) {
        return NextResponse.json(
          { error: "First name, last name, email, password, and phone number are required." },
          { status: 400 }
        );
      }
    } else if (!payload.name || !payload.businessName || !payload.email || !payload.password) {
      return NextResponse.json(
        { error: "Name, business name, email, and password are required." },
        { status: 400 }
      );
    }

    const result = await createVendorAccount(payload);
    const response = NextResponse.json(result, { status: 201 });
    await applySessionCookie(response, result.user, request);
    return response;
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
