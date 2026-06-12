import { NextResponse } from "next/server";
import { queryPostgres } from "@/lib/postgres";
import { getSessionFromRequest } from "@/lib/session";

const VALID_STATUSES = new Set(["available", "busy"]);

export async function PATCH(request) {
  try {
    const user = await getSessionFromRequest(request);

    if (!user || user.role !== "vendor" || !user.vendorSlug) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const payload = await request.json();
    const status = String(payload.status || "").trim().toLowerCase();

    if (!VALID_STATUSES.has(status)) {
      return NextResponse.json({ error: "Status must be 'available' or 'busy'." }, { status: 400 });
    }

    await queryPostgres(
      `UPDATE vendor_profiles SET call_status = $1, updated_at = NOW() WHERE slug = $2`,
      [status, user.vendorSlug]
    );

    return NextResponse.json({ success: true, status, vendorSlug: user.vendorSlug });
  } catch (error) {
    console.error("Failed to update vendor call status:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const user = await getSessionFromRequest(request);

    if (!user || user.role !== "vendor" || !user.vendorSlug) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { rows } = await queryPostgres(
      `SELECT call_status FROM vendor_profiles WHERE slug = $1`,
      [user.vendorSlug]
    );

    return NextResponse.json({ status: rows[0]?.call_status || "available" });
  } catch (error) {
    console.error("Failed to fetch vendor call status:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
