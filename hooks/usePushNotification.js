"use client";

import { useCallback, useEffect, useState } from "react";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from(rawData.split("").map((char) => char.charCodeAt(0)));
}

function isSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

async function registerServiceWorker() {
  if (!isSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/"
    });
    await registration.update();
    return registration;
  } catch (error) {
    console.error("Service worker registration failed:", error.message);
    return null;
  }
}

async function getExistingSubscription() {
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export function usePushNotification() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    setSupported(isSupported());

    if (isSupported()) {
      setPermission(Notification.permission);
      getExistingSubscription().then((sub) => setSubscribed(Boolean(sub)));
    }
  }, []);

  const subscribe = useCallback(async () => {
    setError("");

    if (!supported) {
      setError("Push notifications are not supported in this browser.");
      return;
    }

    if (!VAPID_PUBLIC_KEY) {
      setError("Push notifications are not configured on this server.");
      return;
    }

    setLoading(true);

    try {
      const registration = await registerServiceWorker();
      if (!registration) {
        throw new Error("Unable to register service worker.");
      }

      const currentPermission = await navigator.permissions.query({ name: "notifications" });

      if (Notification.permission === "denied") {
        throw new Error("Notification permission was denied. Please enable it in browser settings.");
      }

      if (Notification.permission !== "granted") {
        const result = await Notification.requestPermission();
        setPermission(result);
        if (result !== "granted") {
          throw new Error("Notification permission not granted.");
        }
      }

      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
      }

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON())
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save subscription.");
      }

      setSubscribed(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [supported]);

  const unsubscribe = useCallback(async () => {
    setError("");
    setLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
      }

      const response = await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to remove subscription.");
      }

      setSubscribed(false);
      setPermission(Notification.permission);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    supported,
    permission,
    subscribed,
    loading,
    error,
    subscribe,
    unsubscribe
  };
}
