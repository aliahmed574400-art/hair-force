import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import nodemailer from "nodemailer";
import axios from "axios";
import webpush from "web-push";

function loadEnvLocal() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;

  const content = readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvLocal();

const SMTP_HOST = process.env.BREVO_SMTP_HOST || "smtp-relay.brevo.com";
const SMTP_PORT = Number(process.env.BREVO_SMTP_PORT) || 587;
const SMTP_USER = process.env.BREVO_SMTP_USER || "";
const SMTP_PASS = process.env.BREVO_SMTP_KEY || process.env.BREVO_SMTP_PASS || "";
const EMAIL_FROM = process.env.EMAIL_FROM || "bookings@hairforce.app";
const BREVO_API_KEY = process.env.BREVO_API_KEY || "";
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";

async function testSMTP() {
  console.log("\n📧 Testing Brevo SMTP...");
  console.log("  Host:", SMTP_HOST);
  console.log("  Port:", SMTP_PORT);
  console.log("  User:", SMTP_USER || "(not set)");
  console.log("  From:", EMAIL_FROM);

  if (!SMTP_USER || !SMTP_PASS) {
    console.log("  ❌ Missing BREVO_SMTP_USER or BREVO_SMTP_KEY");
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });

  try {
    await transporter.verify();
    console.log("  ✅ SMTP authentication successful");
    return true;
  } catch (error) {
    console.log("  ❌ SMTP authentication failed:", error.message);
    if (error.response) {
      console.log("     Server response:", error.response);
    }
    return false;
  }
}

async function testBrevoAPI() {
  console.log("\n📱 Testing Brevo API key...");

  if (!BREVO_API_KEY) {
    console.log("  ❌ BREVO_API_KEY is not set");
    return false;
  }

  if (BREVO_API_KEY.startsWith("xsmtpsib-")) {
    console.log("  ⚠️  This looks like an SMTP key. SMS needs a v3 API key (starts with xkeysib-).");
  }

  try {
    const response = await axios.get("https://api.brevo.com/v3/account", {
      headers: { "api-key": BREVO_API_KEY },
      timeout: 15000
    });
    console.log("  ✅ Brevo API key valid");
    console.log("     Account:", response.data?.email || "N/A");
    return true;
  } catch (error) {
    console.log("  ❌ Brevo API key invalid:", error.response?.data?.message || error.message);
    return false;
  }
}

function testVAPID() {
  console.log("\n🔔 Testing Web Push VAPID keys...");

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.log("  ❌ NEXT_PUBLIC_VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY is not set");
    return false;
  }

  try {
    webpush.setVapidDetails(
      `mailto:${EMAIL_FROM}`,
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );
    console.log("  ✅ VAPID keys are valid format");
    return true;
  } catch (error) {
    console.log("  ❌ VAPID keys invalid:", error.message);
    return false;
  }
}

async function main() {
  console.log("🔍 Hairforce notification channel diagnostic");
  console.log("============================================");

  const smtpOk = await testSMTP();
  const apiOk = await testBrevoAPI();
  const vapidOk = testVAPID();

  console.log("\n📊 Summary");
  console.log("  Email (SMTP):", smtpOk ? "✅" : "❌");
  console.log("  SMS (Brevo API):", apiOk ? "✅" : "❌");
  console.log("  Web Push (VAPID):", vapidOk ? "✅" : "❌");

  if (smtpOk) {
    console.log("\n💡 If emails aren't arriving, check that the sender address (EMAIL_FROM) is verified in Brevo under Senders & IPs > Domains.");
  } else {
    console.log("\n💡 SMTP fix: In Brevo, go to Senders & IPs > SMTP. Create an SMTP key and use it as BREVO_SMTP_KEY. The SMTP user is usually your Brevo account email.");
  }
  if (!apiOk) {
    console.log("\n💡 SMS fix: In Brevo, go to Account > API keys. Create a v3 API key (starts with xkeysib-) and set it as BREVO_API_KEY. Also ensure SMS credits are available.");
  }
  if (!vapidOk) {
    console.log("\n💡 Push fix: Run `npx web-push generate-vapid-keys` and set the public key as NEXT_PUBLIC_VAPID_PUBLIC_KEY and private key as VAPID_PRIVATE_KEY.");
  } else {
    console.log("\n💡 Push won't arrive unless the client enables Browser notifications in Dashboard > Preferences and allows the browser permission prompt.");
  }
}

main().catch((error) => {
  console.error("Diagnostic failed:", error);
  process.exit(1);
});
