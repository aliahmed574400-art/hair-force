import { NextResponse } from "next/server";
import { updateVendorModeration } from "@/lib/postgres-repositories";
import { getSessionFromRequest } from "@/lib/session";

export async function PUT(request, { params }) {
  try {
    const user = getSessionFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const payload = await request.json();
    const data = await updateVendorModeration(user, params.slug, payload);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
}
