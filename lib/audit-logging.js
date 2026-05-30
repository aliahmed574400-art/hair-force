import { hasPostgresDatabase, queryPostgres } from "@/lib/postgres";

/**
 * Audit logging system for tracking sensitive operations.
 * Skips silently when running in demo mode (no DATABASE_URL).
 */

const AUDIT_ACTIONS = {
  VENDOR_APPROVED: "vendor_approved",
  VENDOR_REJECTED: "vendor_rejected",
  VENDOR_SUSPENDED: "vendor_suspended",
  VENDOR_PROFILE_UPDATED: "vendor_profile_updated",
  VENDOR_SERVICE_CREATED: "vendor_service_created",
  VENDOR_SERVICE_UPDATED: "vendor_service_updated",
  VENDOR_SERVICE_DELETED: "vendor_service_deleted",
  VENDOR_AVAILABILITY_UPDATED: "vendor_availability_updated",
  BOOKING_CANCELLED: "booking_cancelled",
  BOOKING_RESCHEDULED: "booking_rescheduled",
  PAYMENT_REFUNDED: "payment_refunded",
  USER_CREATED: "user_created",
  USER_DELETED: "user_deleted",
  USER_SUSPENDED: "user_suspended",
  PASSWORD_CHANGED: "password_changed",
  EMAIL_CHANGED: "email_changed",
  ADMIN_ACTION: "admin_action"
};

/**
 * Log an audit event
 * @param {Object} params
 * @returns {Promise<void>}
 */
export async function logAuditEvent({
  userId,
  action,
  resourceType,
  resourceId,
  oldValues = null,
  newValues = null,
  ipAddress = null,
  userAgent = null
}) {
  try {
    // Skip audit logging in demo mode — no audit_logs table to write to.
    // BUG FIX: previous version checked `queryPostgres.database` (always undefined),
    // which silently dropped every audit call. Now uses the real hasPostgresDatabase flag.
    if (!hasPostgresDatabase) {
      return;
    }

    // Validate action is known
    if (!Object.values(AUDIT_ACTIONS).includes(action)) {
      console.warn(`Unknown audit action: ${action}`);
      return;
    }

    await queryPostgres(
      `
        INSERT INTO audit_logs (
          user_id, action, resource_type, resource_id,
          old_values, new_values, ip_address, user_agent, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      `,
      [
        userId || null,
        action,
        resourceType,
        resourceId,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        ipAddress || null,
        userAgent || null
      ]
    );
  } catch (error) {
    console.error("Failed to log audit event:", error);
    // Don't throw - audit failures shouldn't break the main operation
  }
}

/**
 * Log vendor moderation action
 * @param {Object} params
 */
export async function logVendorModerationAction({
  adminUserId,
  vendorId,
  vendorSlug,
  action,
  reason,
  ipAddress,
  userAgent
}) {
  await logAuditEvent({
    userId: adminUserId,
    action,
    resourceType: "vendor",
    resourceId: vendorSlug,
    newValues: { reason, vendorId },
    ipAddress,
    userAgent
  });
}

/**
 * Log booking action
 * @param {Object} params
 */
export async function logBookingAction({
  userId,
  bookingId,
  action,
  oldStatus,
  newStatus,
  reason,
  ipAddress,
  userAgent
}) {
  await logAuditEvent({
    userId,
    action,
    resourceType: "booking",
    resourceId: bookingId,
    oldValues: { status: oldStatus },
    newValues: { status: newStatus, reason },
    ipAddress,
    userAgent
  });
}

/**
 * Log payment action
 * @param {Object} params
 */
export async function logPaymentAction({
  userId,
  paymentId,
  action,
  oldStatus,
  newStatus,
  amount,
  ipAddress,
  userAgent
}) {
  await logAuditEvent({
    userId,
    action,
    resourceType: "payment",
    resourceId: paymentId,
    oldValues: { status: oldStatus },
    newValues: { status: newStatus, amount },
    ipAddress,
    userAgent
  });
}

/**
 * Log user security action
 * @param {Object} params
 */
export async function logUserSecurityAction({
  userId,
  action,
  ipAddress,
  userAgent
}) {
  await logAuditEvent({
    userId,
    action,
    resourceType: "user",
    resourceId: userId,
    ipAddress,
    userAgent
  });
}

/**
 * Get audit logs for a resource
 * @param {string} resourceType
 * @param {string} resourceId
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export async function getAuditLogsForResource(
  resourceType,
  resourceId,
  limit = 50
) {
  try {
    if (!queryPostgres.database) {
      return [];
    }

    const result = await queryPostgres(
      `
        SELECT * FROM audit_logs
        WHERE resource_type = $1 AND resource_id = $2
        ORDER BY created_at DESC
        LIMIT $3
      `,
      [resourceType, resourceId, limit]
    );

    return result.rows;
  } catch (error) {
    console.error("Failed to fetch audit logs:", error);
    return [];
  }
}

/**
 * Get audit logs for a user
 * @param {string} userId
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export async function getAuditLogsForUser(userId, limit = 100) {
  try {
    if (!queryPostgres.database) {
      return [];
    }

    const result = await queryPostgres(
      `
        SELECT * FROM audit_logs
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `,
      [userId, limit]
    );

    return result.rows;
  } catch (error) {
    console.error("Failed to fetch audit logs:", error);
    return [];
  }
}

/**
 * Export audit logs (for admin panel)
 * @param {string} startDate - ISO date string
 * @param {string} endDate - ISO date string
 * @returns {Promise<Array>}
 */
export async function exportAuditLogs(startDate, endDate) {
  try {
    if (!queryPostgres.database) {
      return [];
    }

    const result = await queryPostgres(
      `
        SELECT * FROM audit_logs
        WHERE created_at >= $1 AND created_at <= $2
        ORDER BY created_at DESC
      `,
      [startDate, endDate]
    );

    return result.rows;
  } catch (error) {
    console.error("Failed to export audit logs:", error);
    return [];
  }
}

/**
 * Clean up old audit logs (run periodically)
 * @param {number} daysToKeep - Default: 90 days
 */
export async function cleanupOldAuditLogs(daysToKeep = 90) {
  try {
    if (!hasPostgresDatabase) {
      return;
    }

    const result = await queryPostgres(
      `
        DELETE FROM audit_logs
        WHERE created_at < NOW() - INTERVAL '${daysToKeep} days'
      `
    );

    console.log(`Deleted ${result.rowCount} old audit logs`);
  } catch (error) {
    console.error("Failed to clean up audit logs:", error);
  }
}

export { AUDIT_ACTIONS };

/**
 * Convenience wrapper that pulls IP + UA from the Request and forwards to
 * logAuditEvent. Use from API routes that have the Request in hand.
 */
export async function auditFromRequest(request, params) {
  const forwarded = request?.headers?.get?.("x-forwarded-for") || "";
  const ipAddress =
    String(forwarded.split(",")[0] || request?.headers?.get?.("x-real-ip") || "").trim() || null;
  const userAgent = request?.headers?.get?.("user-agent") || null;

  return logAuditEvent({
    ...params,
    ipAddress,
    userAgent
  });
}
