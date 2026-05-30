import { NextResponse } from "next/server";
import { AUDIT_ACTIONS, auditFromRequest } from "@/lib/audit-logging";
import { deleteVendorService, updateVendorService } from "@/lib/postgres-repositories";
import { getSessionFromRequest } from "@/lib/session";

export async function PUT(request, { params }) {
  try {
    const user = await getSessionFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const payload = await request.json();
    const dashboard = await updateVendorService(user, params.id, payload);

    await auditFromRequest(request, {
      userId: user.id,
      action: AUDIT_ACTIONS.VENDOR_SERVICE_UPDATED,
      resourceType: "service",
      resourceId: params.id
    });

    return NextResponse.json(dashboard);
  } catch (error) {
    return NextResponse.json({ error: "Unable to update service." }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getSessionFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const dashboard = await deleteVendorService(user, params.id);

    await auditFromRequest(request, {
      userId: user.id,
      action: AUDIT_ACTIONS.VENDOR_SERVICE_DELETED,
      resourceType: "service",
      resourceId: params.id
    });

    return NextResponse.json(dashboard);
  } catch (error) {
    return NextResponse.json({ error: "Unable to delete service." }, { status: 400 });
  }
}
