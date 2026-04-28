import { NextResponse } from "next/server";
import { createVendorAccount } from "@/lib/postgres-repositories";
import { applySessionCookie } from "@/lib/session";

export async function GET() {
  return NextResponse.json({
    categories: ["Salon", "Barber", "Spa", "Makeup", "Nails", "Braids"]
  });
}

export async function POST(request) {
  try {
    const payload = await request.json();

    if (!payload.name || !payload.businessName || !payload.email || !payload.city || !payload.password) {
      return NextResponse.json(
        { error: "Name, business name, email, city, and password are required." },
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
