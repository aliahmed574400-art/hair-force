"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, X, Calendar } from "lucide-react";

const SEVERITY_STYLES = {
  success: {
    border: "#22c55e",
    background: "#f0fdf4",
    iconColor: "#16a34a",
    Icon: CheckCircle
  },
  error: {
    border: "#ef4444",
    background: "#fef2f2",
    iconColor: "#dc2626",
    Icon: XCircle
  },
  info: {
    border: "#3b82f6",
    background: "#eff6ff",
    iconColor: "#2563eb",
    Icon: Calendar
  }
};

export default function NotificationToast({
  title,
  message,
  action,
  severity = "success",
  duration = 5000,
  onClose
}) {
  const [progress, setProgress] = useState(100);
  const [exiting, setExiting] = useState(false);
  const { Icon, iconColor, background, border } = SEVERITY_STYLES[severity] || SEVERITY_STYLES.success;

  useEffect(() => {
    if (!duration || duration <= 0) return;

    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        handleClose();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [duration]);

  function handleClose() {
    setExiting(true);
    setTimeout(() => onClose?.(), 250);
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 20,
        right: 20,
        zIndex: 99999,
        maxWidth: 380,
        width: "calc(100vw - 40px)",
        transform: exiting ? "translateX(120%)" : "translateX(0)",
        opacity: exiting ? 0 : 1,
        transition: "transform 0.25s ease, opacity 0.25s ease"
      }}
    >
      <div
        style={{
          background,
          borderLeft: `4px solid ${border}`,
          borderRadius: 12,
          boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
          padding: 16,
          display: "flex",
          gap: 12,
          alignItems: "flex-start"
        }}
      >
        <div style={{ flexShrink: 0, marginTop: 2 }}>
          <Icon size={22} color={iconColor} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#111827" }}>{title}</h4>
            <button
              type="button"
              onClick={handleClose}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 2,
                color: "#6b7280",
                flexShrink: 0
              }}
              aria-label="Close notification"
            >
              <X size={16} />
            </button>
          </div>

          {message ? (
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "#4b5563", lineHeight: 1.45 }}>{message}</p>
          ) : null}

          {action ? (
            <div style={{ marginTop: 12 }}>
              <a
                href={action.href}
                onClick={handleClose}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  borderRadius: 8,
                  background: "#0070f3",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: "none"
                }}
              >
                {action.label || "View Details"}
              </a>
            </div>
          ) : null}
        </div>
      </div>

      {duration > 0 ? (
        <div
          style={{
            height: 3,
            background: border,
            width: `${progress}%`,
            borderBottomLeftRadius: 12,
            borderBottomRightRadius: 12,
            transition: "width 0.05s linear"
          }}
        />
      ) : null}
    </div>
  );
}
