import nodemailer from "nodemailer";

const SMTP_HOST = process.env.BREVO_SMTP_HOST || "smtp-relay.brevo.com";
const SMTP_PORT = Number(process.env.BREVO_SMTP_PORT) || 587;
const SMTP_USER = process.env.BREVO_SMTP_USER || "";
const SMTP_PASS = process.env.BREVO_SMTP_KEY || process.env.BREVO_SMTP_PASS || "";
const EMAIL_FROM = process.env.EMAIL_FROM || "bookings@hairforce.app";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function createTransporter() {
  if (!SMTP_USER || !SMTP_PASS) {
    return null;
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });
}

function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatAppointmentDateTime(appointmentDate, appointmentSlot) {
  if (!appointmentDate) return "Date pending";
  const parsed = new Date(`${String(appointmentDate).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return String(appointmentDate);

  const datePart = parsed.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  return appointmentSlot ? `${datePart} at ${appointmentSlot}` : datePart;
}

function baseEmailTemplate({ title, preview, heading, bodyContent, footerText, actionButton }) {
  return {
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { margin: 0; padding: 0; background: #f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
    .header { background: linear-gradient(135deg, #0070f3 0%, #005bb5 100%); padding: 32px 24px; text-align: center; }
    .header img { max-height: 48px; }
    .header h1 { color: #ffffff; margin: 12px 0 0; font-size: 22px; font-weight: 700; }
    .content { padding: 32px 24px; color: #1f2937; }
    .content h2 { margin: 0 0 20px; font-size: 20px; color: #111827; }
    .content p { margin: 0 0 16px; line-height: 1.6; font-size: 15px; color: #4b5563; }
    .details { background: #f8fafc; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { font-weight: 600; color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.3px; }
    .detail-value { color: #111827; font-size: 14px; font-weight: 500; text-align: right; }
    .button { display: inline-block; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px; margin: 8px 0; }
    .button-primary { background: #0070f3; color: #ffffff; }
    .button-danger { background: #dc2626; color: #ffffff; }
    .footer { background: #f8fafc; padding: 24px; text-align: center; font-size: 12px; color: #94a3b8; }
    .footer a { color: #64748b; text-decoration: underline; }
    @media only screen and (max-width: 480px) {
      .content { padding: 24px 16px; }
      .detail-row { flex-direction: column; gap: 4px; }
      .detail-value { text-align: left; }
    }
  </style>
</head>
<body>
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <div class="container">
          <div class="header">
            <h1>Hairforce</h1>
          </div>
          <div class="content">
            <h2>${escapeHtml(heading)}</h2>
            ${bodyContent}
            ${actionButton ? `<p style="text-align: center; margin-top: 24px;"><a href="${actionButton.href}" class="button ${actionButton.variant || "button-primary"}">${escapeHtml(actionButton.label)}</a></p>` : ""}
          </div>
          <div class="footer">
            <p>${escapeHtml(footerText)}</p>
            <p>Hairforce Inc. · <a href="${APP_URL}">Visit our website</a></p>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`,
    text: `${title}\n\n${heading}\n\n${bodyContent.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()}\n\n${actionButton ? `${actionButton.label}: ${actionButton.href}` : ""}\n\n${footerText}\nHairforce Inc. · ${APP_URL}`
  };
}

export function isEmailConfigured() {
  return Boolean(SMTP_USER && SMTP_PASS);
}

export async function sendAppointmentConfirmationEmail({
  to,
  customerName,
  vendorName,
  serviceName,
  appointmentDate,
  appointmentSlot,
  location,
  appointmentId,
  vendorSlug
}) {
  const transporter = createTransporter();

  if (!transporter) {
    throw new Error("Email SMTP credentials are not configured.");
  }

  const dateTime = formatAppointmentDateTime(appointmentDate, appointmentSlot);
  const cancellationUrl = `${APP_URL}/dashboard?tab=bookings`;
  const detailsUrl = vendorSlug ? `${APP_URL}/dashboard?tab=bookings` : cancellationUrl;

  const { html, text } = baseEmailTemplate({
    title: "Appointment Confirmed ✅",
    preview: `Your appointment with ${vendorName} is confirmed`,
    heading: "Appointment Confirmed! ✅",
    bodyContent: `
      <p>Hi ${escapeHtml(customerName)},</p>
      <p>Great news! Your appointment has been confirmed. Here are the details:</p>
      <div class="details">
        <div class="detail-row"><span class="detail-label">Service</span><span class="detail-value">${escapeHtml(serviceName)}</span></div>
        <div class="detail-row"><span class="detail-label">With</span><span class="detail-value">${escapeHtml(vendorName)}</span></div>
        <div class="detail-row"><span class="detail-label">When</span><span class="detail-value">${escapeHtml(dateTime)}</span></div>
        <div class="detail-row"><span class="detail-label">Where</span><span class="detail-value">${escapeHtml(location || "Address provided by stylist")}</span></div>
      </div>
      <p>We look forward to seeing you!</p>
    `,
    footerText: "You're receiving this email because you booked an appointment on Hairforce.",
    actionButton: { href: cancellationUrl, label: "Cancel Appointment", variant: "button-danger" }
  });

  const info = await transporter.sendMail({
    from: `"Hairforce" <${EMAIL_FROM}>`,
    to,
    subject: `Appointment Confirmed: ${serviceName} with ${vendorName}`,
    html,
    text
  });

  return { messageId: info.messageId };
}

export async function sendAppointmentCancellationEmail({
  to,
  customerName,
  vendorName,
  serviceName,
  appointmentDate,
  appointmentSlot,
  location
}) {
  const transporter = createTransporter();

  if (!transporter) {
    throw new Error("Email SMTP credentials are not configured.");
  }

  const dateTime = formatAppointmentDateTime(appointmentDate, appointmentSlot);
  const rebookUrl = `${APP_URL}/discover`;

  const { html, text } = baseEmailTemplate({
    title: "Appointment Cancelled",
    preview: `Your appointment with ${vendorName} has been cancelled`,
    heading: "Appointment Cancelled",
    bodyContent: `
      <p>Hi ${escapeHtml(customerName)},</p>
      <p>Your appointment has been cancelled. Here are the details for reference:</p>
      <div class="details">
        <div class="detail-row"><span class="detail-label">Service</span><span class="detail-value">${escapeHtml(serviceName)}</span></div>
        <div class="detail-row"><span class="detail-label">With</span><span class="detail-value">${escapeHtml(vendorName)}</span></div>
        <div class="detail-row"><span class="detail-label">When</span><span class="detail-value">${escapeHtml(dateTime)}</span></div>
        <div class="detail-row"><span class="detail-label">Where</span><span class="detail-value">${escapeHtml(location || "Address provided by stylist")}</span></div>
      </div>
      <p>Would you like to book another appointment?</p>
    `,
    footerText: "You're receiving this email because you had an appointment on Hairforce.",
    actionButton: { href: rebookUrl, label: "Find Another Stylist", variant: "button-primary" }
  });

  const info = await transporter.sendMail({
    from: `"Hairforce" <${EMAIL_FROM}>`,
    to,
    subject: `Appointment Cancelled: ${serviceName} with ${vendorName}`,
    html,
    text
  });

  return { messageId: info.messageId };
}

export async function sendAppointmentReminderEmail({
  to,
  customerName,
  vendorName,
  serviceName,
  appointmentDate,
  appointmentSlot,
  location
}) {
  const transporter = createTransporter();

  if (!transporter) {
    throw new Error("Email SMTP credentials are not configured.");
  }

  const dateTime = formatAppointmentDateTime(appointmentDate, appointmentSlot);

  const { html, text } = baseEmailTemplate({
    title: "Appointment Reminder",
    preview: `Reminder: ${serviceName} with ${vendorName}`,
    heading: "Appointment Reminder",
    bodyContent: `
      <p>Hi ${escapeHtml(customerName)},</p>
      <p>This is a friendly reminder about your upcoming appointment:</p>
      <div class="details">
        <div class="detail-row"><span class="detail-label">Service</span><span class="detail-value">${escapeHtml(serviceName)}</span></div>
        <div class="detail-row"><span class="detail-label">With</span><span class="detail-value">${escapeHtml(vendorName)}</span></div>
        <div class="detail-row"><span class="detail-label">When</span><span class="detail-value">${escapeHtml(dateTime)}</span></div>
        <div class="detail-row"><span class="detail-label">Where</span><span class="detail-value">${escapeHtml(location || "Address provided by stylist")}</span></div>
      </div>
      <p>See you soon!</p>
    `,
    footerText: "You're receiving this email because you booked an appointment on Hairforce.",
    actionButton: { href: `${APP_URL}/dashboard?tab=bookings`, label: "View Appointment", variant: "button-primary" }
  });

  const info = await transporter.sendMail({
    from: `"Hairforce" <${EMAIL_FROM}>`,
    to,
    subject: `Reminder: ${serviceName} with ${vendorName}`,
    html,
    text
  });

  return { messageId: info.messageId };
}


export async function sendPasswordResetOtpEmail({ to, code, expiresInSeconds = 900 }) {
  const transporter = createTransporter();

  if (!transporter) {
    throw new Error("Email SMTP credentials are not configured.");
  }

  const minutes = Math.max(1, Math.round(Number(expiresInSeconds) / 60));

  const { html, text } = baseEmailTemplate({
    title: "Reset your Hairforce password",
    preview: `Your password reset code is ${code}`,
    heading: "Password Reset Request",
    bodyContent: `
      <p>Hi,</p>
      <p>We received a request to reset your Hairforce password. Use the code below to continue:</p>
      <div class="details" style="text-align: center;">
        <p style="font-size: 32px; font-weight: 700; letter-spacing: 4px; margin: 0; color: #111827;">${escapeHtml(String(code))}</p>
      </div>
      <p>This code will expire in ${minutes} minute${minutes === 1 ? "" : "s"}. If you didn't request this, you can safely ignore this email.</p>
    `,
    footerText: "You're receiving this email because a password reset was requested for your Hairforce account.",
    actionButton: null
  });

  const info = await transporter.sendMail({
    from: `"Hairforce" <${EMAIL_FROM}>`,
    to,
    subject: "Your Hairforce password reset code",
    html,
    text
  });

  return { messageId: info.messageId };
}

export async function sendPasswordChangeOtpEmail({ to, code, expiresInSeconds = 900 }) {
  const transporter = createTransporter();

  if (!transporter) {
    throw new Error("Email SMTP credentials are not configured.");
  }

  const minutes = Math.max(1, Math.round(Number(expiresInSeconds) / 60));

  const { html, text } = baseEmailTemplate({
    title: "Verify your Hairforce password change",
    preview: `Your verification code is ${code}`,
    heading: "Password Change Verification",
    bodyContent: `
      <p>Hi,</p>
      <p>To confirm your password change, enter the verification code below:</p>
      <div class="details" style="text-align: center;">
        <p style="font-size: 32px; font-weight: 700; letter-spacing: 4px; margin: 0; color: #111827;">${escapeHtml(String(code))}</p>
      </div>
      <p>This code will expire in ${minutes} minute${minutes === 1 ? "" : "s"}. If you didn't request this, please secure your account immediately.</p>
    `,
    footerText: "You're receiving this email because a password change was requested for your Hairforce account.",
    actionButton: null
  });

  const info = await transporter.sendMail({
    from: `"Hairforce" <${EMAIL_FROM}>`,
    to,
    subject: "Your Hairforce password change code",
    html,
    text
  });

  return { messageId: info.messageId };
}
