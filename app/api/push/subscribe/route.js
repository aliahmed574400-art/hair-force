import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { savePushSubscription } from "@/lib/webpush";

export async function POST(request) {
  try {
    const user = await getSessionFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const payload = await request.json();

    if (!payload || typeof payload !== "object" || !payload.endpoint) {
      return NextResponse.json({ error: "Invalid push subscription." }, { status: 400 });
    }

    await savePushSubscription(user.id, payload);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Push subscribe error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
