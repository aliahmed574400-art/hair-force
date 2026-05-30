import { NextResponse } from "next/server";
import { AUDIT_ACTIONS, auditFromRequest } from "@/lib/audit-logging";
import { changeDashboardPassword } from "@/lib/postgres-repositories";
import { getSessionFromRequest } from "@/lib/session";

export async function POST(request) {
  try {
    const user = await getSessionFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const payload = await request.json();
    const updatedUser = await changeDashboardPassword(user, payload);

    await auditFromRequest(request, {
      userId: user.id,
      action: AUDIT_ACTIONS.PASSWORD_CHANGED,
      resourceType: "user",
      resourceId: user.id
    });

    return NextResponse.json({ user: updatedUser, success: true });
  } catch (error) {
    // SECURITY: Generic error — don't leak whether old password was right,
    // policy violation, etc.
    return NextResponse.json({ error: "Unable to change password." }, { status: 400 });
  }
}
