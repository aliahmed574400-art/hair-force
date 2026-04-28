import { NextResponse } from "next/server";
import { searchDiscoverStylists } from "@/lib/postgres-repositories";

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const results = await searchDiscoverStylists({
    query: searchParams.get("query") || "",
    state: searchParams.get("state") || searchParams.get("city") || "",
    sort: searchParams.get("sort") || "",
    priceRange: searchParams.get("priceRange") || "",
    verifiedOnly: searchParams.get("verifiedOnly") || "",
    instantOnly: searchParams.get("instantOnly") || "",
    nearLat: searchParams.get("nearLat") || "",
    nearLng: searchParams.get("nearLng") || "",
    page: searchParams.get("page") || "",
    limit: searchParams.get("limit") || ""
  });

  return NextResponse.json(results);
}
