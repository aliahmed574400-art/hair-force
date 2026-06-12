"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSocket } from "@/components/providers/SocketProvider";

function playNotificationSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    oscillator.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.4);
  } catch {
    // Ignore audio errors
  }
}

export function useAppointmentNotifications({ onUpdate }) {
  const { socket } = useSocket();
  const [toasts, setToasts] = useState([]);
  const soundEnabledRef = useRef(false);

  // Only play sound after first user interaction to respect browser autoplay policies
  useEffect(() => {
    function enableSound() {
      soundEnabledRef.current = true;
    }

    window.addEventListener("click", enableSound, { once: true });
    window.addEventListener("keydown", enableSound, { once: true });

    return () => {
      window.removeEventListener("click", enableSound);
      window.removeEventListener("keydown", enableSound);
    };
  }, []);

  const addToast = useCallback(({ title, message, severity, action }) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setToasts((current) => [...current, { id, title, message, severity, action }]);

    if (soundEnabledRef.current) {
      playNotificationSound();
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  useEffect(() => {
    if (!socket) return;

    function handleConfirmed(payload) {
      addToast({
        title: "Appointment Confirmed! ✅",
        message: `Your appointment with ${payload.vendorName || "your stylist"} on ${payload.date} at ${payload.time} is confirmed.`,
        severity: "success",
        action: payload.actionUrl ? { href: payload.actionUrl, label: "View Details" } : null
      });

      onUpdate?.(payload);
    }

    function handleCancelled(payload) {
      addToast({
        title: "Appointment Cancelled",
        message: `Your appointment with ${payload.vendorName || "your stylist"} on ${payload.date} at ${payload.time} has been cancelled.`,
        severity: "error",
        action: payload.actionUrl ? { href: payload.actionUrl, label: "View Details" } : null
      });

      onUpdate?.(payload);
    }

    function handleReminder(payload) {
      addToast({
        title: "Appointment Reminder",
        message: `Reminder: ${payload.serviceName || "Your appointment"} with ${payload.vendorName || "your stylist"} on ${payload.date} at ${payload.time}.`,
        severity: "info",
        action: payload.actionUrl ? { href: payload.actionUrl, label: "View Details" } : null
      });

      onUpdate?.(payload);
    }

    socket.on("appointment:confirmed", handleConfirmed);
    socket.on("appointment:cancelled", handleCancelled);
    socket.on("appointment:reminder", handleReminder);

    return () => {
      socket.off("appointment:confirmed", handleConfirmed);
      socket.off("appointment:cancelled", handleCancelled);
      socket.off("appointment:reminder", handleReminder);
    };
  }, [socket, addToast, onUpdate]);

  return { toasts, removeToast };
}
