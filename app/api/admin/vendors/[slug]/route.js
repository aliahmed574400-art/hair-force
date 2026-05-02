import { NextResponse } from "next/server";
import { updateVendorModeration } from "@/lib/postgres-repositories";
import { getSessionFromRequest } from "@/lib/session";

export async function PUT(request, { params }) {
  try {
    const user = await getSessionFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    // CRITICAL: Verify user is admin - this endpoint is admin-only
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Only administrators can moderate vendors." }, { status: 403 });
    }

    const payload = await request.json();
    const data = await updateVendorModeration(user, params.slug, payload);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update vendor moderation status." }, { status: 403 });
  }
}
