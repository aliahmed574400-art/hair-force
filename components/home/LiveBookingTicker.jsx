"use client";

import { useEffect, useRef, useState } from "react";

const FAKE_BOOKINGS = [
  { name: "Maria L.", action: "booked a balayage", location: "Brooklyn, NY", ago: 28 },
  { name: "Devin P.", action: "booked a beard sculpt", location: "Chicago, IL", ago: 54 },
  { name: "Aisha K.", action: "rescheduled a facial", location: "Austin, TX", ago: 92 },
  { name: "Jordan R.", action: "booked a sleek bob", location: "Beverly Hills, CA", ago: 134 },
  { name: "Priya S.", action: "booked event styling", location: "Naples, FL", ago: 198 },
  { name: "Tomás V.", action: "booked a skin fade", location: "Nashville, TN", ago: 246 },
  { name: "Lena M.", action: "booked nails + brows", location: "Seattle, WA", ago: 312 }
];

const SHOW_DELAY_MS = 4000;
const VISIBLE_MS = 5500;
const GAP_MS = 1200;

function formatAgo(seconds) {
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return `${hours} hr ago`;
}

export default function LiveBookingTicker() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (dismissed) return undefined;

    const showTimer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => clearTimeout(showTimer);
  }, [dismissed]);

  useEffect(() => {
    if (dismissed || !visible) return undefined;

    timerRef.current = setTimeout(() => {
      setVisible(false);
      const nextTimer = setTimeout(() => {
        setIndex((current) => (current + 1) % FAKE_BOOKINGS.length);
        setVisible(true);
      }, GAP_MS);
      timerRef.current = nextTimer;
    }, VISIBLE_MS);

    return () => clearTimeout(timerRef.current);
  }, [index, visible, dismissed]);

  if (dismissed) return null;

  const current = FAKE_BOOKINGS[index];

  return (
    <div
      className={`live-ticker ${visible ? "is-visible" : ""}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="live-ticker-pulse" aria-hidden="true">
        <span />
      </span>

      <div className="live-ticker-body">
        <p className="live-ticker-text">
          <strong>{current.name}</strong> {current.action} in <em>{current.location}</em>
        </p>
        <span className="live-ticker-meta">{formatAgo(current.ago)} · live activity</span>
      </div>

      <button
        type="button"
        className="live-ticker-dismiss"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss live activity"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </div>
  );
}
