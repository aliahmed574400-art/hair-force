"use client";

import { Bell, BellOff, Loader2 } from "lucide-react";
import { usePushNotification } from "@/hooks/usePushNotification";

export function PushNotificationToggle() {
  const { supported, subscribed, loading, error, subscribe, unsubscribe } = usePushNotification();

  if (!supported) {
    return (
      <div className="client-admin-toggle disabled" style={{ opacity: 0.6 }}>
        <BellOff size={18} />
        <span>
          <strong>Browser notifications</strong>
          <small>Not supported in this browser.</small>
        </span>
      </div>
    );
  }

  return (
    <div className="client-admin-preferences">
      <button
        type="button"
        className="client-admin-toggle"
        onClick={subscribed ? unsubscribe : subscribe}
        disabled={loading}
        style={{ textAlign: "left" }}
      >
        {loading ? <Loader2 size={18} className="spin" /> : subscribed ? <Bell size={18} /> : <BellOff size={18} />}
        <span>
          <strong>{subscribed ? "Browser notifications on" : "Browser notifications off"}</strong>
          <small>
            {subscribed
              ? "You'll receive push alerts even when Hairforce is closed."
              : "Enable push alerts for booking confirmations and reminders."}
          </small>
        </span>
      </button>
      {error && (
        <p style={{ margin: "6px 0 0", fontSize: 12, color: "#dc2626" }}>{error}</p>
      )}
    </div>
  );
}
