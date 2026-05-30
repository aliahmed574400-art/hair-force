import { NextResponse } from "next/server";
import { AUDIT_ACTIONS, auditFromRequest } from "@/lib/audit-logging";
import {
  getDashboardDataForUser,
  updateClientProfile,
  updateVendorProfile
} from "@/lib/postgres-repositories";
import { getSessionFromRequest } from "@/lib/session";

export async function GET(request) {
  const user = await getSessionFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const dashboard = await getDashboardDataForUser(user);
    return NextResponse.json(dashboard);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch profile." }, { status: 400 });
  }
}

export async function PUT(request) {
  try {
    const user = await getSessionFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const payload = await request.json();

    if (user.role === "client") {
      const updatedUser = await updateClientProfile(user, payload);
      return NextResponse.json({ user: updatedUser });
    }

    if (user.role === "vendor") {
      const dashboard = await updateVendorProfile(user, payload);
      await auditFromRequest(request, {
        userId: user.id,
        action: AUDIT_ACTIONS.VENDOR_PROFILE_UPDATED,
        resourceType: "vendor",
        resourceId: user.vendorSlug || user.id
      });
      return NextResponse.json(dashboard);
    }

    return NextResponse.json({ error: "Invalid user role." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update profile." }, { status: 400 });
  }
}
