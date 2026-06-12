import axios from "axios";

const BREVO_API_KEY = process.env.BREVO_API_KEY || "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function formatDateTime(appointmentDate, appointmentSlot) {
  if (!appointmentDate) return "Date pending";
  const parsed = new Date(`${String(appointmentDate).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return String(appointmentDate);

  const datePart = parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });

  return appointmentSlot ? `${datePart} at ${appointmentSlot}` : datePart;
}

export function isSMSConfigured() {
  return Boolean(BREVO_API_KEY);
}

export function normalizePhone(phone) {
  if (!phone) return "";

  const trimmed = String(phone).trim();

  // Already in E.164 international format (e.g. +44..., +33..., +1...)
  if (trimmed.startsWith("+")) {
    const digits = trimmed.replace(/\D/g, "");
    // E.164 allows up to 15 digits including country code; minimum is 7.
    if (digits.length >= 7 && digits.length <= 15) {
      return `+${digits}`;
    }
    return "";
  }

  // No country code provided: assume US/Canada (+1)
  const digits = trimmed.replace(/\D/g, "");

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  return "";
}

async function sendBrevoSMS({ to, message, sender = "Hairforce" }) {
  if (!BREVO_API_KEY) {
    throw new Error("Brevo API key is not configured.");
  }

  const normalizedTo = normalizePhone(to);

  if (!normalizedTo) {
    throw new Error(
      "Invalid phone number. Use a 10-digit US/Canada number or E.164 international format (e.g. +14155552671, +442071838750)."
    );
  }

  const response = await axios.post(
    "https://api.brevo.com/v3/transactionalSMS/sms",
    {
      sender,
      recipient: normalizedTo,
      content: message,
      type: "transactional"
    },
    {
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json"
      },
      timeout: 15000
    }
  );

  return response.data;
}

export async function sendAppointmentConfirmationSMS({
  to,
  customerName,
  vendorName,
  serviceName,
  appointmentDate,
  appointmentSlot,
  address,
  appointmentId
}) {
  const dateTime = formatDateTime(appointmentDate, appointmentSlot);
  const cancellationUrl = `${APP_URL}/dashboard?tab=bookings`;

  const message =
    `Hi ${customerName || "there"}! Your appointment with ${vendorName} ` +
    `for ${serviceName} on ${dateTime} is CONFIRMED ✅\n` +
    `Address: ${address || "See app"}\n` +
    `Cancel: ${cancellationUrl}\n` +
    `Reply STOP to unsubscribe.`;

  return sendBrevoSMS({ to, message });
}

export async function sendAppointmentCancellationSMS({
  to,
  customerName,
  vendorName,
  serviceName,
  appointmentDate,
  appointmentSlot
}) {
  const dateTime = formatDateTime(appointmentDate, appointmentSlot);

  const message =
    `Hi ${customerName || "there"}. Your appointment with ${vendorName} ` +
    `for ${serviceName} on ${dateTime} has been cancelled.\n` +
    `Book another: ${APP_URL}/discover\n` +
    `Reply STOP to unsubscribe.`;

  return sendBrevoSMS({ to, message });
}

export async function sendAppointmentReminderSMS({
  to,
  customerName,
  vendorName,
  serviceName,
  appointmentDate,
  appointmentSlot
}) {
  const dateTime = formatDateTime(appointmentDate, appointmentSlot);

  const message =
    `Hi ${customerName || "there"}! Reminder: ${serviceName} with ${vendorName} ` +
    `on ${dateTime}. See you soon!\n` +
    `${APP_URL}/dashboard?tab=bookings\n` +
    `Reply STOP to unsubscribe.`;

  return sendBrevoSMS({ to, message });
}
