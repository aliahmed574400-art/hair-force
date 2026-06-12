import webpush from "web-push";
import { queryPostgres } from "./postgres.js";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const EMAIL_FROM = process.env.EMAIL_FROM || "bookings@hairforce.app";

let initialized = false;

export function initWebPush() {
  if (initialized) return;

  if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      `mailto:${EMAIL_FROM}`,
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );
    initialized = true;
  }
}

export function isWebPushConfigured() {
  return Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
}

export function getVapidPublicKey() {
  return VAPID_PUBLIC_KEY;
}

export async function savePushSubscription(userId, subscription) {
  if (!userId || !subscription) {
    throw new Error("User ID and subscription are required.");
  }

  await queryPostgres(
    "UPDATE users SET push_subscription = $1, updated_at = NOW() WHERE id = $2",
    [JSON.stringify(subscription), userId]
  );
}

export async function removePushSubscription(userId) {
  if (!userId) return;

  await queryPostgres(
    "UPDATE users SET push_subscription = NULL, updated_at = NOW() WHERE id = $1",
    [userId]
  );
}

export async function getPushSubscription(userId) {
  if (!userId) return null;

  const { rows } = await queryPostgres(
    "SELECT push_subscription FROM users WHERE id = $1",
    [userId]
  );

  return rows[0]?.push_subscription || null;
}

export async function sendPushNotification({ userId, title, body, icon, badge, data, tag, requireInteraction }) {
  initWebPush();

  if (!initialized) {
    throw new Error("Web Push VAPID keys are not configured.");
  }

  const subscription = await getPushSubscription(userId);

  if (!subscription) {
    throw new Error("No push subscription found for user.");
  }

  const payload = JSON.stringify({
    title,
    body,
    icon: icon || "/logo.png",
    badge: badge || "/badge.png",
    tag: tag || "appointment",
    requireInteraction: requireInteraction ?? false,
    data: data || {}
  });

  try {
    const result = await webpush.sendNotification(subscription, payload);
    return { success: true, statusCode: result.statusCode };
  } catch (error) {
    if (error.statusCode === 410 || error.statusCode === 404) {
      // Subscription expired or invalid — remove it
      await removePushSubscription(userId);
      throw new Error("Push subscription expired and has been removed.");
    }

    throw error;
  }
}
