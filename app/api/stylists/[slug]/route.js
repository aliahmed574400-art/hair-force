import { NextResponse } from "next/server";
import { getStylistBySlug } from "@/lib/postgres-repositories";

export async function GET(_request, { params }) {
  const stylist = await getStylistBySlug(params.slug);

  if (!stylist) {
    return NextResponse.json({ error: "Stylist not found." }, { status: 404 });
  }

  return NextResponse.json({ stylist });
}
