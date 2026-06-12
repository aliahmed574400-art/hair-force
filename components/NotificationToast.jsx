"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react";

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info
};

const STYLES = {
  success: {
    border: "#22c55e",
    background: "#f0fdf4",
    icon: "#22c55e",
    progress: "#22c55e"
  },
  error: {
    border: "#ef4444",
    background: "#fef2f2",
    icon: "#ef4444",
    progress: "#ef4444"
  },
  info: {
    border: "#3b82f6",
    background: "#eff6ff",
    icon: "#3b82f6",
    progress: "#3b82f6"
  }
};

export function NotificationToast({ id, title, message, severity = "info", action, onDismiss, duration = 5000 }) {
  const [progress, setProgress] = useState(100);
  const theme = STYLES[severity] || STYLES.info;
  const Icon = ICONS[severity] || Info;

  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        onDismiss(id);
      }
    }, 50);

    return () => clearInterval(timer);
  }, [id, duration, onDismiss]);

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position: "relative",
        width: "100%",
        maxWidth: 380,
        borderRadius: 14,
        border: `1px solid ${theme.border}`,
        background: theme.background,
        boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
        overflow: "hidden",
        animation: "slideIn 250ms ease-out",
        pointerEvents: "auto"
      }}
    >
      <div style={{ display: "flex", gap: 12, padding: "14px 16px" }}>
        <div style={{ flexShrink: 0, marginTop: 2 }}>
          <Icon size={20} color={theme.icon} aria-hidden="true" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: "#111827" }}>{title}</p>
          {message && (
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#4b5563", lineHeight: 1.45 }}>{message}</p>
          )}
          {action?.href && (
            <Link
              href={action.href}
              onClick={() => onDismiss(id)}
              style={{
                display: "inline-block",
                marginTop: 10,
                fontSize: 13,
                fontWeight: 600,
                color: theme.icon,
                textDecoration: "none"
              }}
            >
              {action.label || "View Details"} →
            </Link>
          )}
        </div>
        <button
          type="button"
          onClick={() => onDismiss(id)}
          aria-label="Dismiss notification"
          style={{
            flexShrink: 0,
            width: 26,
            height: 26,
            border: "none",
            background: "transparent",
            borderRadius: 6,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#6b7280"
          }}
        >
          <X size={16} />
        </button>
      </div>
      <div
        style={{
          height: 3,
          width: `${progress}%`,
          background: theme.progress,
          transition: "width 50ms linear"
        }}
      />
      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}

export function NotificationToastContainer({ children }) {
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      style={{
        position: "fixed",
        top: 84,
        right: 16,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        alignItems: "flex-end",
        pointerEvents: "none"
      }}
    >
      {children}
    </div>
  );
}
