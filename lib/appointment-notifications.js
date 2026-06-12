import {
  sendAppointmentConfirmationEmail,
  isEmailConfigured
} from "./email";
import {
  sendAppointmentConfirmationSMS,
  isSMSConfigured,
  normalizePhone
} from "./sms";
import {
  sendPushNotification,
  getPushSubscription,
  isWebPushConfigured
} from "./webpush";
import { broadcastAppointmentConfirmed } from "./socket-server";
import { queryPostgres, hasPostgresDatabase } from "./postgres";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

async function getVendorLocation(vendorSlug) {
  if (!hasPostgresDatabase || !vendorSlug) return "";

  try {
    const { rows } = await queryPostgres(
      `SELECT city, area, location FROM vendor_profiles WHERE slug = $1`,
      [vendorSlug]
    );

    if (!rows.length) return "";

    const { city, area, location } = rows[0];
    return [location, area, city].filter(Boolean).join(", ") || "";
  } catch {
    return "";
  }
}

function formatDateTime(appointmentDate, appointmentSlot) {
  if (!appointmentDate) return "Date pending";
  const parsed = new Date(`${String(appointmentDate).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return String(appointmentDate);

  const datePart = parsed.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric"
  });

  return appointmentSlot ? `${datePart} at ${appointmentSlot}` : datePart;
}

function getActionUrl(booking) {
  return `${APP_URL}/dashboard?tab=bookings`;
}

async function markNotificationsSent(bookingId) {
  if (!hasPostgresDatabase || !bookingId) return;

  try {
    await queryPostgres(
      `UPDATE bookings SET notifications_sent = TRUE, updated_at = NOW() WHERE id = $1`,
      [bookingId]
    );
  } catch (error) {
    console.error("Failed to mark notifications_sent for booking", bookingId, error.message);
  }
}

function maskEmail(email) {
  if (!email || !email.includes("@")) return "(none)";
  const [local, domain] = email.split("@");
  const maskedLocal = local.length > 2 ? `${local.slice(0, 2)}***` : "***";
  return `${maskedLocal}@${domain}`;
}

function maskPhone(phone) {
  if (!phone) return "(none)";
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length < 4) return "(too short)";
  return `***${digits.slice(-4)}`;
}

export async function sendAppointmentConfirmationNotifications(booking, options = {}) {
  if (!booking) return { sent: [], skipped: [], errors: [] };

  const results = {
    sent: [],
    skipped: [],
    errors: []
  };

  const customerId = booking.customerId || options.customerId;
  const customerEmail = booking.customerEmail || options.customerEmail;
  const customerPhone = booking.customerPhone || options.customerPhone;
  const customerName = booking.customerName || options.customerName || "there";
  const vendorName = booking.vendorName || options.vendorName || "your stylist";
  const serviceName = booking.serviceName || options.serviceName || "appointment";
  const appointmentDate = booking.appointmentDate || options.appointmentDate;
  const appointmentSlot = booking.appointmentSlot || options.appointmentSlot;
  const vendorSlug = booking.vendorSlug || options.vendorSlug;
  const bookingId = booking.id || options.bookingId;

  const address = options.address || (await getVendorLocation(vendorSlug));
  const actionUrl = options.actionUrl || getActionUrl(booking);
  const dateTime = formatDateTime(appointmentDate, appointmentSlot);

  console.log("[Appointment Notifications] Starting confirmation blast for booking:", {
    bookingId,
    customerId,
    customerEmail: maskEmail(customerEmail),
    customerPhone: maskPhone(customerPhone),
    rawPhone: customerPhone ? `"${customerPhone}"` : null,
    vendorName,
    serviceName,
    appointmentDate,
    appointmentSlot,
    emailConfigured: isEmailConfigured(),
    smsConfigured: isSMSConfigured(),
    webPushConfigured: isWebPushConfigured()
  });

  const channels = [];

  // 1. Email
  if (customerEmail && isEmailConfigured()) {
    console.log("[Appointment Notifications] Attempting email to", maskEmail(customerEmail));
    channels.push(
      sendAppointmentConfirmationEmail({
        to: customerEmail,
        customerName,
        vendorName,
        serviceName,
        appointmentDate,
        appointmentSlot,
        location: address,
        appointmentId: bookingId,
        vendorSlug
      })
        .then((result) => {
          console.log("[Appointment Notifications] Email sent:", result?.messageId);
          results.sent.push("email");
        })
        .catch((error) => {
          console.error("[Appointment Notifications] Email failed:", error.message);
          results.errors.push({ channel: "email", message: error.message });
        })
    );
  } else {
    const reason = !customerEmail ? "no_customer_email" : "smtp_not_configured";
    console.log("[Appointment Notifications] Email skipped:", reason);
    results.skipped.push({ channel: "email", reason });
  }

  // 2. In-app Socket.io toast
  if (customerId) {
    channels.push(
      Promise.resolve()
        .then(() => {
          broadcastAppointmentConfirmed(customerId, {
            bookingId,
            vendorName,
            serviceName,
            date: appointmentDate,
            time: appointmentSlot,
            dateTime,
            actionUrl
          });
          console.log("[Appointment Notifications] Socket toast emitted to user:", customerId);
          results.sent.push("socket");
        })
        .catch((error) => {
          console.error("[Appointment Notifications] Socket failed:", error.message);
          results.errors.push({ channel: "socket", message: error.message });
        })
    );
  } else {
    console.log("[Appointment Notifications] Socket skipped: no_customer_id");
    results.skipped.push({ channel: "socket", reason: "no_customer_id" });
  }

  // 3. Browser Web Push
  if (customerId && isWebPushConfigured()) {
    const pushPromise = getPushSubscription(customerId)
      .then((subscription) => {
        if (!subscription) {
          console.log("[Appointment Notifications] Push skipped: no_subscription_for_user", customerId);
          results.skipped.push({ channel: "push", reason: "no_subscription" });
          return;
        }

        console.log("[Appointment Notifications] Attempting push to subscription:", subscription.endpoint?.slice(0, 60) + "...");

        return sendPushNotification({
          userId: customerId,
          title: "Appointment Confirmed ✅",
          body: `${serviceName} with ${vendorName} on ${dateTime}`,
          icon: "/logo.png",
          badge: "/badge.png",
          tag: `booking-${bookingId}`,
          requireInteraction: false,
          data: {
            actionUrl,
            bookingId,
            type: "appointment_confirmed"
          }
        })
          .then((result) => {
            console.log("[Appointment Notifications] Push sent:", result);
            results.sent.push("push");
          })
          .catch((error) => {
            console.error("[Appointment Notifications] Push failed:", error.message);
            results.errors.push({ channel: "push", message: error.message });
          });
      })
      .catch((error) => {
        console.error("[Appointment Notifications] Push lookup failed:", error.message);
        results.errors.push({ channel: "push", message: error.message });
      });

    channels.push(pushPromise);
  } else {
    const reason = !customerId ? "no_customer_id" : "vapid_not_configured";
    console.log("[Appointment Notifications] Push skipped:", reason);
    results.skipped.push({ channel: "push", reason });
  }

  // 4. SMS
  if (customerPhone && isSMSConfigured()) {
    const normalizedPhone = normalizePhone(customerPhone);
    console.log("[Appointment Notifications] Attempting SMS to", maskPhone(customerPhone), "normalized:", normalizedPhone ? "valid" : "invalid");

    if (!normalizedPhone) {
      console.log("[Appointment Notifications] SMS skipped: invalid_phone_format");
      results.skipped.push({ channel: "sms", reason: "invalid_phone_format", raw: customerPhone });
    } else {
      channels.push(
        sendAppointmentConfirmationSMS({
          to: normalizedPhone,
          customerName,
          vendorName,
          serviceName,
          appointmentDate,
          appointmentSlot,
          address,
          appointmentId: bookingId
        })
          .then((result) => {
            console.log("[Appointment Notifications] SMS sent:", result);
            results.sent.push("sms");
          })
          .catch((error) => {
            console.error("[Appointment Notifications] SMS failed:", error.message);
            results.errors.push({ channel: "sms", message: error.message });
          })
      );
    }
  } else {
    const reason = !customerPhone ? "no_customer_phone" : !isSMSConfigured() ? "brevo_not_configured" : "unknown";
    console.log("[Appointment Notifications] SMS skipped:", reason);
    results.skipped.push({ channel: "sms", reason });
  }

  await Promise.allSettled(channels);

  // Guard against duplicate sends once at least one channel succeeded.
  if (results.sent.length > 0 && !options.skipMarkSent) {
    await markNotificationsSent(bookingId);
  }

  console.log("[Appointment Notifications] Blast complete for booking", bookingId, {
    sent: results.sent,
    skipped: results.skipped,
    errors: results.errors
  });

  return results;
}
