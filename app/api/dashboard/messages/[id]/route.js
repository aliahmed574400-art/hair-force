import { NextResponse } from "next/server";
import {
  getBookingConversationForUser,
  sendBookingMessage
} from "@/lib/postgres-repositories";
import { getSessionFromRequest } from "@/lib/session";

export async function GET(request, { params }) {
  try {
    const user = await getSessionFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const conversation = await getBookingConversationForUser(user, params.id);
    return NextResponse.json(conversation);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function POST(request, { params }) {
  try {
    const user = await getSessionFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const payload = await request.json();
    const conversation = await sendBookingMessage(user, params.id, payload);
    return NextResponse.json(conversation, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
