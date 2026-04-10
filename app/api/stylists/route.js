import { NextResponse } from "next/server";
import { getStylists } from "@/lib/postgres-repositories";

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const stylists = await getStylists({
    query: searchParams.get("query") || "",
    city: searchParams.get("city") || "",
    category: searchParams.get("category") || ""
  });

  return NextResponse.json({ stylists });
}
