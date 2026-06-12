/* eslint-disable no-restricted-globals */

const CACHE_NAME = "hairforce-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Hairforce", body: event.data.text() };
  }

  const title = payload.title || "Hairforce";
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/logo.png",
    badge: payload.badge || "/badge.png",
    tag: payload.tag || "hairforce-notification",
    requireInteraction: payload.requireInteraction ?? false,
    vibrate: payload.vibrate || [200, 100, 200],
    data: payload.data || {},
    actions: payload.data?.actionUrl
      ? [{ action: "open", title: "View Details" }]
      : []
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const url = data.actionUrl || data.url || "/dashboard?tab=bookings";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === url && "focus" in client) {
            return client.focus();
          }
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      })
  );
});

self.addEventListener("notificationclose", () => {
  // Optionally log notification close analytics
});

self.addEventListener("fetch", (event) => {
  // Pass through all fetch requests
  event.respondWith(fetch(event.request));
});
