import { NextResponse } from "next/server";
import { ensureDirectConversation } from "@/lib/postgres-repositories";
import { getSessionFromRequest } from "@/lib/session";

export async function POST(request) {
  try {
    const user = await getSessionFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (user.role !== "client") {
      return NextResponse.json({ error: "Only clients can start direct conversations." }, { status: 403 });
    }

    const payload = await request.json();
    const vendorSlug = String(payload.vendorSlug || "").trim();

    if (!vendorSlug) {
      return NextResponse.json({ error: "Vendor slug is required." }, { status: 400 });
    }

    const result = await ensureDirectConversation(user, vendorSlug);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed to create conversation." }, { status: 400 });
  }
}
