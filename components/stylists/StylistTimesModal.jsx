"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Plus,
  Search,
  Star,
  X
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function pad(value) {
  return String(value).padStart(2, "0");
}

function formatDateInput(year, month, day) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function parseIsoDate(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]) - 1,
    day: Number(match[3])
  };
}

function getMonthAnchor(date) {
  return `${date.year}-${pad(date.month + 1)}-15`;
}

function shiftMonth(date, delta) {
  const next = new Date(Date.UTC(date.year, date.month + delta, 15, 12));
  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth(),
    day: 15
  };
}

function getTodayIso() {
  const now = new Date();
  return formatDateInput(now.getFullYear(), now.getMonth(), now.getDate());
}

function serviceBookingLabel(service) {
  return service?.bookingMethod === "approval" ? "Request to book" : "Instant booking";
}

function buildBookingHref(slug, serviceId, date, slot) {
  const params = new URLSearchParams();
  if (serviceId) params.set("service", serviceId);
  if (date) params.set("date", date);
  if (slot) params.set("slot", slot);
  const query = params.toString();
  return `/book/${slug}${query ? `?${query}` : ""}`;
}

export default function StylistTimesModal({ stylist, service, onClose }) {
  const router = useRouter();
  const todayIso = useMemo(() => getTodayIso(), []);
  const todayParts = useMemo(() => parseIsoDate(todayIso), [todayIso]);

  const [reference, setReference] = useState(() => ({
    year: todayParts.year,
    month: todayParts.month
  }));
  const [monthData, setMonthData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(false);

  const referenceAnchor = getMonthAnchor({ ...reference, day: 15 });

  useEffect(() => {
    if (!service?.id) return undefined;

    let cancelled = false;
    setLoading(true);
    setError("");

    async function load() {
      try {
        const params = new URLSearchParams({
          serviceId: service.id,
          view: "month",
          referenceDate: referenceAnchor
        });
        const response = await fetch(
          `/api/stylists/${stylist.slug}/availability?${params.toString()}`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to load available times.");
        }

        if (cancelled) return;

        setMonthData(data.month || null);

        const firstAvailable = (data.month?.days || []).find(
          (day) =>
            day.isCurrentMonth &&
            day.slotCount > 0 &&
            day.date >= todayIso
        );

        if (firstAvailable) {
          setSelectedDate(firstAvailable.date);
          setSelectedSlot(firstAvailable.slots?.[0] || "");
        } else {
          setSelectedDate("");
          setSelectedSlot("");
        }
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError.message);
        setMonthData(null);
        setSelectedDate("");
        setSelectedSlot("");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [stylist.slug, service?.id, referenceAnchor, todayIso]);

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const currentMonthDays = monthData?.days || [];
  const selectedDay = currentMonthDays.find((day) => day.date === selectedDate) || null;
  const availableInMonth = currentMonthDays.filter(
    (day) => day.isCurrentMonth && day.slotCount > 0 && day.date >= todayIso
  ).length;
  const isLimited = availableInMonth > 0 && availableInMonth <= 6;
  const monthLabel =
    monthData?.rangeLabel ||
    new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      month: "long",
      year: "numeric"
    }).format(new Date(Date.UTC(reference.year, reference.month, 15, 12)));

  const canGoPrev =
    reference.year > todayParts.year ||
    (reference.year === todayParts.year && reference.month > todayParts.month);

  const handleMonthShift = (delta) => {
    setReference((prev) => {
      const next = shiftMonth({ ...prev, day: 15 }, delta);
      return { year: next.year, month: next.month };
    });
  };

  const handleSelectDay = (day) => {
    if (!day.slotCount || day.date < todayIso) return;
    setSelectedDate(day.date);
    setSelectedSlot(day.slots?.[0] || "");
  };

  const continueHref = buildBookingHref(stylist.slug, service.id, selectedDate, selectedSlot);
  const continueDisabled = !selectedDate || !selectedSlot;
  const rating = Number(stylist.rating);

  async function handleContinueBooking(event) {
    event.preventDefault();
    if (continueDisabled) return;

    setCheckingAuth(true);
    try {
      const response = await fetch("/api/auth/me");
      const data = await response.json();

      if (data.user) {
        router.push(continueHref);
      } else {
        router.push(`/signin?redirect=${encodeURIComponent(continueHref)}`);
      }
    } catch {
      router.push(`/signin?redirect=${encodeURIComponent(continueHref)}`);
    } finally {
      setCheckingAuth(false);
    }
  }

  return (
    <div
      className="stm-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`Book ${service.title} with ${stylist.name}`}
      onClick={onClose}
    >
      <div className="stm-shell" onClick={(event) => event.stopPropagation()}>
        <header className="stm-head">
          <div className="stm-head-stylist">
            <span className="stm-head-eyebrow">Your appointment with</span>
            <div className="stm-head-meta">
              <span className="stm-head-avatar" aria-hidden="true">
                {stylist.avatar ? (
                  <img src={stylist.avatar} alt="" />
                ) : (
                  <span>
                    {String(stylist.name || "HF")
                      .split(/\s+/)
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((part) => part.charAt(0).toUpperCase())
                      .join("")}
                  </span>
                )}
              </span>
              <strong>{stylist.name}</strong>
              {Number.isFinite(rating) && rating > 0 ? (
                <span className="stm-head-rating">
                  <Star size={12} strokeWidth={2} aria-hidden="true" />
                  {rating.toFixed(1)}
                </span>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            className="stm-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} strokeWidth={1.9} aria-hidden="true" />
          </button>
        </header>

        <div className="stm-body">
          <div className="stm-service">
            <h3>{service.title}</h3>
            <p>
              {formatCurrency(service.price)}
              {service.metadata?.priceIsStartingAt ? "+" : ""}
              <span aria-hidden="true"> · </span>
              {service.duration}
            </p>
          </div>

          <button type="button" className="stm-add-service" disabled>
            <Plus size={14} strokeWidth={1.9} aria-hidden="true" />
            Add another service
          </button>

          {isLimited ? (
            <div className="stm-callout">
              <span className="stm-callout-dot" aria-hidden="true" />
              <div>
                <strong>Limited spots left in {monthLabel.split(" ")[0]}</strong>
                <span>Book soon.</span>
              </div>
            </div>
          ) : null}

          <div className="stm-cal-head">
            <button
              type="button"
              className="stm-cal-nav"
              onClick={() => handleMonthShift(-1)}
              disabled={!canGoPrev}
              aria-label="Previous month"
            >
              <ChevronLeft size={16} strokeWidth={1.9} aria-hidden="true" />
            </button>
            <span className="stm-cal-month">{monthLabel}</span>
            <button
              type="button"
              className="stm-cal-nav"
              onClick={() => handleMonthShift(1)}
              aria-label="Next month"
            >
              <ChevronRight size={16} strokeWidth={1.9} aria-hidden="true" />
            </button>
          </div>

          <div className="stm-cal-weekdays" aria-hidden="true">
            {WEEKDAY_LABELS.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>

          {loading ? (
            <div className="stm-cal-empty">Loading available days…</div>
          ) : error ? (
            <div className="stm-cal-empty stm-cal-empty-error">{error}</div>
          ) : currentMonthDays.length ? (
            <>
              <div className="stm-cal-grid">
                {currentMonthDays.map((day) => {
                  const isPast = day.date < todayIso;
                  const isCurrentMonth = day.isCurrentMonth;
                  const isAvailable = day.slotCount > 0 && !isPast && isCurrentMonth;
                  const isFullyBooked = day.slotCount === 0 && !isPast && isCurrentMonth;
                  const isSelected = day.date === selectedDate;
                  const isGoingFast = day.slotCount > 0 && day.slotCount <= 2 && !isPast;
                  const classes = ["stm-cal-cell"];
                  if (!isCurrentMonth) classes.push("is-outside");
                  if (isPast) classes.push("is-past");
                  if (isAvailable) classes.push("is-available");
                  if (!isAvailable && !isFullyBooked) classes.push("is-unavailable");
                  if (isFullyBooked) classes.push("is-fully-booked");
                  if (isSelected) classes.push("is-selected");
                  if (day.isToday) classes.push("is-today");

                  return (
                    <button
                      key={day.date}
                      type="button"
                      className={classes.join(" ")}
                      onClick={() => handleSelectDay(day)}
                      disabled={!isAvailable}
                      aria-label={`${day.date}${isAvailable ? "" : isFullyBooked ? ", fully booked" : ", unavailable"}`}
                      aria-pressed={isSelected}
                    >
                      <span>{Number(day.dayNumber)}</span>
                      {isFullyBooked ? (
                        <span className="stm-cal-cross" aria-hidden="true">×</span>
                      ) : isGoingFast ? (
                        <span className="stm-cal-going-dot" aria-hidden="true" />
                      ) : null}
                    </button>
                  );
                })}
              </div>

              <div className="stm-cal-legend" aria-hidden="true">
                <span className="stm-cal-going-dot" />
                going fast
              </div>

              {selectedDay && selectedDay.slots?.length ? (
                <div className="stm-slot-block">
                  <span className="stm-slot-head">
                    {new Intl.DateTimeFormat("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric"
                    }).format(new Date(`${selectedDay.date}T12:00:00Z`))}
                  </span>
                  <div className="stm-slot-row">
                    {selectedDay.slots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        className={`stm-slot ${selectedSlot === slot ? "is-active" : ""}`}
                        onClick={() => setSelectedSlot(slot)}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <div className="stm-cal-empty">
              No public slots are available for this service in {monthLabel}. Try the
              next month or message the stylist directly.
            </div>
          )}

          <div className="stm-search-row">
            <Search size={16} strokeWidth={1.9} aria-hidden="true" />
            <div>
              <strong>Looking for a specific date?</strong>
              <span>
                Pick a month above, or use the full booking page for date and add-on
                options.
              </span>
            </div>
            <Link
              href={buildBookingHref(stylist.slug, service.id)}
              className="stm-search-cta"
            >
              <ChevronRight size={16} strokeWidth={1.9} aria-hidden="true" />
            </Link>
          </div>
        </div>

        <footer className="stm-foot">
          <div className="stm-foot-summary">
            <strong>{serviceBookingLabel(service)}</strong>
            <span>
              {selectedDate && selectedSlot
                ? `${new Intl.DateTimeFormat("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric"
                  }).format(new Date(`${selectedDate}T12:00:00Z`))} · ${selectedSlot}`
                : "Choose a day and time to continue."}
            </span>
          </div>

          <div className="stm-foot-actions">
            <Link
              href={buildBookingHref(stylist.slug, service.id)}
              className="stm-message"
            >
              <MessageCircle size={14} strokeWidth={1.9} aria-hidden="true" />
              Message
            </Link>
            <button
              type="button"
              className={`stm-continue ${continueDisabled || checkingAuth ? "is-disabled" : ""}`}
              disabled={continueDisabled || checkingAuth}
              onClick={handleContinueBooking}
            >
              {checkingAuth ? "Checking…" : "Continue booking"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
