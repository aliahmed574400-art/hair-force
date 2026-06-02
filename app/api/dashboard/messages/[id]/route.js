import { NextResponse } from "next/server";
import {
  getBookingConversationForUser,
  sendBookingMessage
} from "@/lib/postgres-repositories";
import { getSessionFromRequest } from "@/lib/session";
import {
  broadcastMessage,
  broadcastNotification,
  broadcastVendorNotification
} from "@/lib/socket-server";

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
    const result = await sendBookingMessage(user, params.id, payload);

    // Broadcast the new message to all clients in this conversation
    broadcastMessage(params.id, {
      messages: result.messages || []
    });

    // Broadcast a notification to the recipient
    const conv = result.conversation;
    if (conv) {
      if (user.role === "vendor" && conv.clientId) {
        broadcastNotification(conv.clientId, {
          type: "message",
          title: "New message",
          message: `${conv.vendorName || "Your stylist"} sent you a message.`,
          ctaHref: "/dashboard?tab=messages",
          metadata: { conversationId: conv.id }
        });
      } else if (user.role !== "vendor" && conv.vendorSlug) {
        broadcastVendorNotification(conv.vendorSlug, {
          type: "message",
          title: "New message",
          message: `${conv.customerName || "A client"} sent you a message.`,
          ctaHref: "/dashboard?tab=messages",
          metadata: { conversationId: conv.id }
        });
      }
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
