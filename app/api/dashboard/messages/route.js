import { NextResponse } from "next/server";
import {
  ensureBookingConversationForUser,
  getDashboardDataForUser
} from "@/lib/postgres-repositories";
import { getSessionFromRequest } from "@/lib/session";

export async function GET(request) {
  const user = await getSessionFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const dashboard = await getDashboardDataForUser(user);
  return NextResponse.json({ conversations: dashboard?.conversations || [] });
}

export async function POST(request) {
  try {
    const user = await getSessionFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const payload = await request.json();
    const conversation = await ensureBookingConversationForUser(user, payload.bookingId);
    return NextResponse.json(conversation, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
