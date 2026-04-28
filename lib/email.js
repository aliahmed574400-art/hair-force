const RESEND_API_URL = "https://api.resend.com/emails";

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function sendPasswordResetOtpEmail({ to, code, expiresInSeconds }) {
  const resendApiKey = String(process.env.RESEND_API_KEY || "").trim();
  const resendFromEmail = String(process.env.RESEND_FROM_EMAIL || "").trim();
  const expiresInMinutes = Math.max(1, Math.ceil(Number(expiresInSeconds || 0) / 60));

  if (!resendApiKey || !resendFromEmail) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Password reset email is not configured yet.");
    }

    return {
      delivered: false,
      provider: "development"
    };
  }

  const codeMarkup = escapeHtml(code);
  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: resendFromEmail,
      to: [String(to || "").trim()],
      subject: "Your Hair Force password reset code",
      text: `Your Hair Force password reset code is ${code}. It expires in ${expiresInMinutes} minute${expiresInMinutes === 1 ? "" : "s"}.`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;">
          <p style="margin:0 0 12px;font-size:14px;letter-spacing:.08em;text-transform:uppercase;color:#2563eb;">
            Hair Force
          </p>
          <h1 style="margin:0 0 12px;font-size:28px;line-height:1.2;">Reset your password</h1>
          <p style="margin:0 0 18px;font-size:16px;line-height:1.6;">
            Use this verification code to continue resetting your Hair Force password.
          </p>
          <div style="margin:0 0 18px;padding:18px 20px;border-radius:18px;background:#eff6ff;border:1px solid #bfdbfe;font-size:32px;font-weight:700;letter-spacing:.32em;text-align:center;">
            ${codeMarkup}
          </div>
          <p style="margin:0;font-size:14px;line-height:1.6;color:#475569;">
            This code expires in ${expiresInMinutes} minute${expiresInMinutes === 1 ? "" : "s"}.
          </p>
        </div>
      `
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Password reset email could not be sent.");
  }

  const data = await response.json();

  return {
    delivered: true,
    provider: "resend",
    id: data?.id || null
  };
}
