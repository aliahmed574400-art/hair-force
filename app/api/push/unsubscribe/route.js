import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { removePushSubscription } from "@/lib/webpush";

export async function POST(request) {
  try {
    const user = await getSessionFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    await removePushSubscription(user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Push unsubscribe error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
