import { NextResponse } from "next/server";
import { AUDIT_ACTIONS, auditFromRequest } from "@/lib/audit-logging";
import { createVendorService, getDashboardDataForUser } from "@/lib/postgres-repositories";
import { getSessionFromRequest } from "@/lib/session";

export async function GET(request) {
  try {
    const user = await getSessionFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const dashboard = await getDashboardDataForUser(user);
    return NextResponse.json(dashboard);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch dashboard." }, { status: 400 });
  }
}

export async function POST(request) {
  try {
    const user = await getSessionFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    // SECURITY: Only vendors can create services
    if (user.role !== "vendor") {
      return NextResponse.json({ error: "Only vendors can create services." }, { status: 403 });
    }

    const payload = await request.json();
    const dashboard = await createVendorService(user, payload);

    await auditFromRequest(request, {
      userId: user.id,
      action: AUDIT_ACTIONS.VENDOR_SERVICE_CREATED,
      resourceType: "service",
      resourceId: user.vendorSlug || user.id
    });

    return NextResponse.json(dashboard, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create service." }, { status: 400 });
  }
}
