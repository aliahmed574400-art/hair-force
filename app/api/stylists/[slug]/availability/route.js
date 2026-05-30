import { NextResponse } from "next/server";
import { getStylistAvailability } from "@/lib/postgres-repositories";

export async function GET(request, { params }) {
  try {
    const { searchParams } = new URL(request.url);
    const availability = await getStylistAvailability(params.slug, {
      serviceId: searchParams.get("serviceId") || "",
      minLeadHours: Number(searchParams.get("minLeadHours") || 0),
      maxWindows: Number(searchParams.get("maxWindows") || 12),
      view: searchParams.get("view") || "",
      referenceDate: searchParams.get("referenceDate") || "",
      timezone: searchParams.get("timezone") || ""
    });

    return NextResponse.json(availability);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
