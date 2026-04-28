import { NextResponse } from "next/server";
import { deleteVendorService, updateVendorService } from "@/lib/postgres-repositories";
import { getSessionFromRequest } from "@/lib/session";

export async function PUT(request, { params }) {
  try {
    const user = await getSessionFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const payload = await request.json();
    const dashboard = await updateVendorService(user, params.id, payload);
    return NextResponse.json(dashboard);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getSessionFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const dashboard = await deleteVendorService(user, params.id);
    return NextResponse.json(dashboard);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
