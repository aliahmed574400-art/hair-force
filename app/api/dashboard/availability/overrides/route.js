import { NextResponse } from "next/server";
import {
  copyVendorAvailabilityOverrides,
  createVendorAvailabilityOverride,
  deleteVendorAvailabilityOverride,
  updateVendorAvailabilityOverride
} from "@/lib/postgres-repositories";
import { getSessionFromRequest } from "@/lib/session";

async function requireUser(request) {
  const user = await getSessionFromRequest(request);

  if (!user) {
    throw Object.assign(new Error("Unauthorized."), { status: 401 });
  }

  return user;
}

function toErrorResponse(error) {
  return NextResponse.json({ error: error.message }, { status: error.status || 400 });
}

export async function POST(request) {
  try {
    const user = await requireUser(request);
    const payload = await request.json();
    const dashboard =
      String(payload.action || "").trim().toLowerCase() === "copy"
        ? await copyVendorAvailabilityOverrides(user, payload)
        : await createVendorAvailabilityOverride(user, payload);

    return NextResponse.json(dashboard);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request) {
  try {
    const user = await requireUser(request);
    const payload = await request.json();
    const overrideId = String(payload.overrideId || payload.id || "").trim();

    if (!overrideId) {
      throw new Error("Availability block id is required.");
    }

    const dashboard = await updateVendorAvailabilityOverride(user, overrideId, payload);
    return NextResponse.json(dashboard);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request) {
  try {
    const user = await requireUser(request);
    let payload = {};

    try {
      payload = await request.json();
    } catch {
      payload = {};
    }

    const { searchParams } = new URL(request.url);
    const overrideId = String(payload.overrideId || searchParams.get("overrideId") || "").trim();

    if (!overrideId) {
      throw new Error("Availability block id is required.");
    }

    const dashboard = await deleteVendorAvailabilityOverride(user, overrideId);
    return NextResponse.json(dashboard);
  } catch (error) {
    return toErrorResponse(error);
  }
}
