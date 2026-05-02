import { NextResponse } from "next/server";
import { getVendorAvailabilityCalendar } from "@/lib/postgres-repositories";
import { getSessionFromRequest } from "@/lib/session";

export async function GET(request) {
  try {
    const user = await getSessionFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const agenda = await getVendorAvailabilityCalendar(user, {
      view: searchParams.get("view") || "week",
      referenceDate: searchParams.get("referenceDate") || ""
    });

    return NextResponse.json(agenda);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
