import { NextResponse } from "next/server";
import { removeFavoriteStylist } from "@/lib/postgres-repositories";
import { getSessionFromRequest } from "@/lib/session";

export async function DELETE(request, { params }) {
  try {
    const user = await getSessionFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const dashboard = await removeFavoriteStylist(user, params.vendorSlug);
    return NextResponse.json(dashboard);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
