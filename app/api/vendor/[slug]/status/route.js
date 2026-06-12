import { NextResponse } from "next/server";
import { queryPostgres } from "@/lib/postgres";

export async function GET(request, { params }) {
  try {
    const slug = String(params.slug || "").trim();

    if (!slug) {
      return NextResponse.json({ error: "Vendor slug is required." }, { status: 400 });
    }

    const { rows } = await queryPostgres(
      `SELECT call_status FROM vendor_profiles WHERE slug = $1`,
      [slug]
    );

    if (!rows.length) {
      return NextResponse.json({ error: "Vendor not found." }, { status: 404 });
    }

    return NextResponse.json({ status: rows[0].call_status || "available" });
  } catch (error) {
    console.error("Failed to fetch vendor call status:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
