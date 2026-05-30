import { NextResponse } from "next/server";
import { AUDIT_ACTIONS, auditFromRequest } from "@/lib/audit-logging";
import { changeDashboardLoginEmail } from "@/lib/postgres-repositories";
import { getSessionFromRequest } from "@/lib/session";

export async function PUT(request) {
  try {
    const user = await getSessionFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const payload = await request.json();
    const oldEmail = user.email;
    const updatedUser = await changeDashboardLoginEmail(user, payload);

    await auditFromRequest(request, {
      userId: user.id,
      action: AUDIT_ACTIONS.EMAIL_CHANGED,
      resourceType: "user",
      resourceId: user.id,
      oldValues: { email: oldEmail },
      newValues: { email: updatedUser.email }
    });

    return NextResponse.json({ user: updatedUser, success: true });
  } catch (error) {
    return NextResponse.json({ error: "Unable to change email." }, { status: 400 });
  }
}
