import { NextResponse } from "next/server";
import { reverseGeocodeCoordinates } from "@/lib/google-maps";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const location = await reverseGeocodeCoordinates({
      latitude: searchParams.get("lat"),
      longitude: searchParams.get("lng")
    });

    return NextResponse.json({ location });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
