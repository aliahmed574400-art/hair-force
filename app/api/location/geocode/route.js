import { NextResponse } from "next/server";
import { geocodeLocationQuery } from "@/lib/google-maps";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address") || "";

    if (!address.trim()) {
      return NextResponse.json({ error: "Address is required." }, { status: 400 });
    }

    const location = await geocodeLocationQuery({ location: address });

    return NextResponse.json({ location });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
