import { NextResponse } from "next/server";
import {
  removeClientPaymentMethod,
  setDefaultClientPaymentMethod
} from "@/lib/postgres-repositories";
import { getSessionFromRequest } from "@/lib/session";

export async function PATCH(request, { params }) {
  try {
    const user = await getSessionFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const payload = await request.json();

    if (payload.action !== "setDefault") {
      return NextResponse.json({ error: "Unsupported payment method action." }, { status: 400 });
    }

    const dashboard = await setDefaultClientPaymentMethod(user, params.id);
    return NextResponse.json(dashboard);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getSessionFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const dashboard = await removeClientPaymentMethod(user, params.id);
    return NextResponse.json(dashboard);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
