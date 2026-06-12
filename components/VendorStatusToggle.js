"use client";

import { useCallback, useEffect, useState } from "react";
import { useSocket } from "@/components/providers/SocketProvider";

export function VendorStatusToggle({ vendorSlug, initialStatus = "available" }) {
  const { socket } = useSocket();
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);

  // Fetch current status on mount
  useEffect(() => {
    if (!vendorSlug) return;
    let cancelled = false;
    async function fetchStatus() {
      try {
        const response = await fetch(`/api/vendor/${encodeURIComponent(vendorSlug)}/status`);
        const data = await response.json();
        if (!cancelled && response.ok) {
          setStatus(data.status || "available");
        }
      } catch (error) {
        console.error("Failed to fetch vendor status:", error.message);
      }
    }
    fetchStatus();
    return () => {
      cancelled = true;
    };
  }, [vendorSlug]);

  // Listen for real-time status updates (broadcast to vendor room)
  useEffect(() => {
    if (!socket || !vendorSlug) return;

    function handleStatusUpdate(payload) {
      if (payload?.vendorId === vendorSlug) {
        setStatus(payload.status || "available");
      }
    }

    socket.on("vendor:status_updated", handleStatusUpdate);
    return () => {
      socket.off("vendor:status_updated", handleStatusUpdate);
    };
  }, [socket, vendorSlug]);

  const toggleStatus = useCallback(async () => {
    if (!vendorSlug || loading) return;
    const nextStatus = status === "available" ? "busy" : "available";
    setLoading(true);

    try {
      const response = await fetch("/api/vendor/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });

      if (!response.ok) {
        throw new Error("Failed to update status.");
      }

      setStatus(nextStatus);
      socket?.emit("vendor:status_change", { status: nextStatus });
    } catch (error) {
      console.error("Failed to update vendor status:", error.message);
    } finally {
      setLoading(false);
    }
  }, [loading, socket, status, vendorSlug]);

  const isAvailable = status === "available";

  return (
    <button
      type="button"
      onClick={toggleStatus}
      disabled={loading}
      title={isAvailable ? "Set status to Busy" : "Set status to Available"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 12px",
        borderRadius: 999,
        border: "1px solid #e5e7eb",
        background: "#fff",
        color: "#374151",
        fontSize: 13,
        fontWeight: 600,
        cursor: loading ? "wait" : "pointer",
        opacity: loading ? 0.7 : 1,
        transition: "all 150ms ease"
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: isAvailable ? "#22c55e" : "#dc2626",
          boxShadow: `0 0 0 3px ${isAvailable ? "rgba(34,197,94,0.2)" : "rgba(220,38,38,0.2)"}`
        }}
      />
      {isAvailable ? "Available" : "Busy"}
    </button>
  );
}
