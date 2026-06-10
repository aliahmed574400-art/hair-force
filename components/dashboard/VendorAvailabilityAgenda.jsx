"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Loader2,
  Plus,
  Trash2
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const INTERNAL_TABS = [
  { id: "calendar", label: "View Calendar", icon: CalendarDays },
  { id: "manage", label: "Manage Availability", icon: Clock3 },
  { id: "vacation", label: "Vacation Time", icon: CalendarRange }
];

const CALENDAR_VIEW_OPTIONS = [
  { value: "day", label: "1 Day" },
  { value: "3days", label: "3 Days" },
  { value: "week", label: "Week" }
];

const WEEKDAY_OPTIONS = [
  { value: 0, label: "Sunday", short: "SUN" },
  { value: 1, label: "Monday", short: "MON" },
  { value: 2, label: "Tuesday", short: "TUE" },
  { value: 3, label: "Wednesday", short: "WED" },
  { value: 4, label: "Thursday", short: "THU" },
  { value: 5, label: "Friday", short: "FRI" },
  { value: 6, label: "Saturday", short: "SAT" }
];

const MANAGE_WEEKDAY_ROWS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" }
];

const COMMON_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Toronto",
  "Australia/Sydney"
];

function normalizeDateOnly(value) {
  const input = String(value || "").trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(input) ? input : "";
}

function createDateOnly(value) {
  const normalized = normalizeDateOnly(value);

  if (!normalized) {
    return null;
  }

  const parsed = new Date(`${normalized}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateInputFallback(value, fallback) {
  return normalizeDateOnly(value) || normalizeDateOnly(fallback) || normalizeDateOnly(new Date().toISOString());
}

function addDays(value, amount) {
  const date = createDateOnly(value) || new Date();
  date.setDate(date.getDate() + Number(amount || 0));
  return normalizeDateOnly(date.toISOString());
}

function addMonths(value, amount) {
  const date = createDateOnly(value) || new Date();
  date.setMonth(date.getMonth() + Number(amount || 0), 1);
  return normalizeDateOnly(date.toISOString());
}

function getMonthStartKey(value) {
  const date = createDateOnly(value) || new Date();
  date.setDate(1);
  return normalizeDateOnly(date.toISOString());
}

function formatMonthLabel(value) {
  const date = createDateOnly(value);

  if (!date) {
    return "";
  }

  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric"
  });
}

function formatFullDate(value) {
  const date = createDateOnly(value);

  if (!date) {
    return value || "Pick a date";
  }

  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

function formatLongDate(value) {
  const date = createDateOnly(value);

  if (!date) {
    return value || "Pick a date";
  }

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric"
  });
}

function formatShortDate(value) {
  const date = createDateOnly(value);

  if (!date) {
    return value || "";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });
}

function normalizeCalendarView(value) {
  if (value === "day" || value === "3days" || value === "week") {
    return value;
  }

  return "week";
}

function shiftReferenceDate(value, view, direction) {
  const normalizedView = normalizeCalendarView(view);
  const days = normalizedView === "day" ? 1 : normalizedView === "3days" ? 3 : 7;
  return addDays(value, days * Number(direction || 0));
}

function formatTimeLabel(value) {
  const input = String(value || "").trim();

  if (!input) {
    return "";
  }

  if (/^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(input)) {
    return input.toUpperCase();
  }

  if (!/^\d{2}:\d{2}$/.test(input)) {
    return input;
  }

  const [hours, minutes] = input.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const normalizedHours = hours % 12 || 12;
  return `${normalizedHours}:${String(minutes).padStart(2, "0")} ${period}`;
}

function timeToMinutes(value) {
  const match = String(value || "").match(/^(\d{2}):(\d{2})$/);

  if (!match) {
    return -1;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

function formatTimeRange(block) {
  if (!block) {
    return "";
  }

  if (block.isAllDay) {
    return "All day";
  }

  return `${formatTimeLabel(block.startTime)} - ${formatTimeLabel(block.endTime)}`;
}

function dayStatusLabel(day) {
  if (!day) {
    return "";
  }

  if (day.hasFullDayReserve) {
    return "Reserved";
  }

  if (day.status === "mixed") {
    return "Booked + open";
  }

  if (day.status === "booked") {
    return "Booked";
  }

  if (day.status === "available") {
    return "Open";
  }

  if (day.status === "closed") {
    return "Closed";
  }

  return "Off";
}

function blockToneClass(block) {
  if (!block) {
    return "";
  }

  if (block.type === "reserve_full_day") {
    return "tone-reserved";
  }

  if (block.type === "off_time") {
    return "tone-off-time";
  }

  if (block.type === "extra_hours") {
    return "tone-extra-hours";
  }

  if (block.tone === "warning") {
    return "tone-warning";
  }

  if (block.tone === "muted") {
    return "tone-muted";
  }

  return "tone-booking";
}

function blockKindLabel(block) {
  if (!block) {
    return "";
  }

  if (block.type === "reserve_full_day") {
    return block.startDate !== block.endDate ? "Vacation" : "Reserved day";
  }

  if (block.type === "off_time") {
    return "Off timing";
  }

  if (block.type === "extra_hours") {
    return "Extra hours";
  }

  if (block.type === "booking") {
    return "Booking";
  }

  return "Availability block";
}

function availabilitySignature(availabilityForm = []) {
  return availabilityForm
    .map(
      (item) =>
        `${item.dayOfWeek}:${item.startTime}:${item.endTime}:${item.slotMinutes}:${item.active !== false}`
    )
    .join("|");
}

function bookingSignature(bookings = []) {
  return bookings
    .map(
      (booking) =>
        `${booking.id}:${booking.status}:${booking.appointmentDate}:${booking.appointmentSlot}:${booking.updatedAt || ""}`
    )
    .join("|");
}

function overrideSignature(overrides = []) {
  return overrides
    .map(
      (override) =>
        `${override.id}:${override.type}:${override.startDate}:${override.endDate}:${override.startTime || ""}:${override.endTime || ""}:${override.slotMinutes || ""}:${override.updatedAt || ""}`
    )
    .join("|");
}

function parseBlackoutDates(text) {
  return new Set(
    String(text || "")
      .split(",")
      .map((value) => normalizeDateOnly(value))
      .filter(Boolean)
  );
}

function createQuarterHourOptions() {
  return Array.from({ length: 96 }, (_, index) => {
    const totalMinutes = index * 15;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const value = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

    return {
      value,
      label: formatTimeLabel(value)
    };
  });
}

const QUARTER_HOUR_OPTIONS = createQuarterHourOptions();
const START_TIME_OPTIONS = QUARTER_HOUR_OPTIONS.filter((option) => timeToMinutes(option.value) <= 23 * 60 + 30);

function filterTimeOptions({ min = -1, max = 24 * 60, exclusiveMin = false, exclusiveMax = false } = {}) {
  return QUARTER_HOUR_OPTIONS.filter((option) => {
    const minutes = timeToMinutes(option.value);

    if (exclusiveMin ? minutes <= min : minutes < min) {
      return false;
    }

    if (exclusiveMax ? minutes >= max : minutes > max) {
      return false;
    }

    return true;
  });
}

function getBlockAvatarLabel(block) {
  const name = String(block?.preview?.customerName || block?.details?.customerName || block?.title || "HF");

  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function getBlockStyle(block, timeBounds) {
  const gridStart = Number(timeBounds?.startMinutes || 0);
  const gridEnd = Number(timeBounds?.endMinutes || 0);
  const total = Math.max(60, gridEnd - gridStart);
  const safeStart = Math.max(gridStart, Number(block?.startMinutes || 0));
  const safeEnd = Math.min(gridEnd, Number(block?.endMinutes || 0));
  const top = ((safeStart - gridStart) / total) * 100;
  const height = Math.max(7, ((safeEnd - safeStart) / total) * 100);

  return {
    top: `${top}%`,
    height: `${height}%`
  };
}

function buildManageDayDraft(dayOfWeek, matchingRules = []) {
  const activeRules = [...matchingRules]
    .filter((rule) => rule.active !== false)
    .sort((left, right) => String(left.startTime || "").localeCompare(String(right.startTime || "")));

  if (!activeRules.length) {
    return {
      dayOfWeek,
      enabled: false,
      startTime: "09:00",
      endTime: "18:00",
      hasBreak: false,
      breakStart: "12:00",
      breakEnd: "13:00",
      slotMinutes: "60"
    };
  }

  const firstRule = activeRules[0];
  const secondRule = activeRules[1];
  const lastRule = activeRules[activeRules.length - 1];
  const hasBreak =
    activeRules.length > 1 &&
    firstRule?.endTime &&
    secondRule?.startTime &&
    timeToMinutes(firstRule.endTime) < timeToMinutes(secondRule.startTime);

  return {
    dayOfWeek,
    enabled: true,
    startTime: firstRule.startTime || "09:00",
    endTime: lastRule.endTime || "18:00",
    hasBreak,
    breakStart: hasBreak ? firstRule.endTime : "12:00",
    breakEnd: hasBreak ? secondRule.startTime : "13:00",
    slotMinutes: String(firstRule.slotMinutes || 60)
  };
}

function buildManageDraftFromRules(availabilityForm = []) {
  return MANAGE_WEEKDAY_ROWS.map((day) =>
    buildManageDayDraft(
      Number(day.value),
      (availabilityForm || []).filter((rule) => Number(rule.dayOfWeek) === Number(day.value))
    )
  );
}

function buildRulesFromManageDraft(days = []) {
  return days.flatMap((day) => {
    if (!day.enabled) {
      return [];
    }

    const slotMinutes = Math.max(15, Number(day.slotMinutes || 60));
    const startMinutes = timeToMinutes(day.startTime);
    const endMinutes = timeToMinutes(day.endTime);

    if (startMinutes < 0 || endMinutes <= startMinutes) {
      return [];
    }

    const baseRule = {
      dayOfWeek: Number(day.dayOfWeek),
      slotMinutes,
      active: true
    };

    if (day.hasBreak) {
      const breakStartMinutes = timeToMinutes(day.breakStart);
      const breakEndMinutes = timeToMinutes(day.breakEnd);

      if (
        breakStartMinutes > startMinutes &&
        breakEndMinutes > breakStartMinutes &&
        breakEndMinutes < endMinutes
      ) {
        return [
          {
            ...baseRule,
            startTime: day.startTime,
            endTime: day.breakStart
          },
          {
            ...baseRule,
            startTime: day.breakEnd,
            endTime: day.endTime
          }
        ];
      }
    }

    return [
      {
        ...baseRule,
        startTime: day.startTime,
        endTime: day.endTime
      }
    ];
  });
}

function isActiveBooking(booking) {
  const status = String(booking?.status || "").trim().toLowerCase();
  return status !== "cancelled" && status !== "canceled" && status !== "rejected";
}

function countBookingsOnDate(bookings = [], dateKey = "") {
  return bookings.filter(
    (booking) => isActiveBooking(booking) && normalizeDateOnly(booking.appointmentDate) === dateKey
  ).length;
}

function countBookingsInRange(bookings = [], startDate = "", endDate = "") {
  const safeStart = normalizeDateOnly(startDate);
  const safeEnd = normalizeDateOnly(endDate) || safeStart;

  if (!safeStart || !safeEnd) {
    return 0;
  }

  return bookings.filter((booking) => {
    if (!isActiveBooking(booking)) {
      return false;
    }

    const dateKey = normalizeDateOnly(booking.appointmentDate);
    return dateKey >= safeStart && dateKey <= safeEnd;
  }).length;
}

function hasReserveOnDate(dateKey, overrides = [], blackoutDates = new Set()) {
  if (blackoutDates.has(dateKey)) {
    return true;
  }

  return overrides.some(
    (override) =>
      override.type === "reserve_full_day" &&
      dateKey >= normalizeDateOnly(override.startDate) &&
      dateKey <= normalizeDateOnly(override.endDate)
  );
}

function hasOffTimeOnDate(dateKey, overrides = []) {
  return overrides.some(
    (override) =>
      override.type === "off_time" &&
      dateKey >= normalizeDateOnly(override.startDate) &&
      dateKey <= normalizeDateOnly(override.endDate)
  );
}

function hasExtraHoursOnDate(dateKey, overrides = []) {
  return overrides.some(
    (override) =>
      override.type === "extra_hours" &&
      dateKey >= normalizeDateOnly(override.startDate) &&
      dateKey <= normalizeDateOnly(override.endDate)
  );
}

function getSavedDayMap(days = []) {
  return new Map(days.map((day) => [Number(day.dayOfWeek), day]));
}


function buildVacationPickerDays({
  monthKey,
  bookings,
  overrides,
  blackoutDates,
  vacationDraft,
  todayKey
}) {
  const monthStart = createDateOnly(getMonthStartKey(monthKey)) || createDateOnly(todayKey);

  if (!monthStart) {
    return [];
  }

  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - monthStart.getDay());
  const startDate = normalizeDateOnly(vacationDraft.startDate);
  const endDate = normalizeDateOnly(vacationDraft.endDate || vacationDraft.startDate);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const dateKey = normalizeDateOnly(date.toISOString());
    const inRange = Boolean(startDate && endDate && dateKey >= startDate && dateKey <= endDate);

    return {
      dateKey,
      dayLabel: date.getDate(),
      currentMonth: date.getMonth() === monthStart.getMonth(),
      isToday: dateKey === todayKey,
      isStart: dateKey === startDate,
      isEnd: dateKey === endDate,
      inRange,
      bookingCount: countBookingsOnDate(bookings, dateKey),
      reserved: hasReserveOnDate(dateKey, overrides, blackoutDates)
    };
  });
}

function TimeSelect({ value, options, onChange }) {
  return (
    <select className="form-control vendor-availability-time-select" value={value} onChange={onChange}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function AgendaCalendarView({
  agenda,
  selectedDate,
  selectedBlockId,
  dashboardBookings,
  onSelectDate,
  onSelectBlock,
  onViewBookingDetails
}) {
  if (!agenda) {
    return null;
  }

  const intervalCount = Math.max(1, agenda.timeLabels.length - 1);

  return (
    <div className="vendor-agenda-week vendor-availability-calendar-grid">
      <div
        className="vendor-agenda-week-head"
        style={{ "--vendor-agenda-day-columns": agenda.days.length }}
      >
        <div className="vendor-agenda-week-corner">
          <div className="vendor-agenda-week-corner-icon">
            <CalendarDays size={18} />
          </div>
        </div>
        {agenda.days.map((day) => (
          <button
            key={day.date}
            type="button"
            className={`vendor-agenda-weekday ${selectedDate === day.date ? "active" : ""}`}
            onClick={() => onSelectDate(day.date)}
          >
            <strong>{`${day.weekdayShort.toUpperCase()} ${Number(day.dayNumber)}`}</strong>
            <span>{day.monthShort}</span>
            <em>{dayStatusLabel(day)}</em>
          </button>
        ))}
      </div>

      <div
        className="vendor-agenda-week-grid"
        style={{
          "--vendor-agenda-grid-hours": intervalCount,
          "--vendor-agenda-grid-height": `${Math.max(580, intervalCount * 94)}px`,
          "--vendor-agenda-day-columns": agenda.days.length
        }}
      >
        <div className="vendor-agenda-time-axis">
          {agenda.timeLabels.slice(0, -1).map((label) => (
            <div key={label.time} className="vendor-agenda-time-label">
              <span>{label.label}</span>
            </div>
          ))}
        </div>

        {agenda.days.map((day) => (
          <div
            key={day.date}
            className={`vendor-agenda-day-column ${selectedDate === day.date ? "active" : ""} status-${day.status}`}
            onClick={() => onSelectDate(day.date)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelectDate(day.date);
              }
            }}
            role="button"
            tabIndex={0}
          >
            {day.hasFullDayReserve ? (
              <div className="vendor-agenda-day-ribbon">Reserved day</div>
            ) : null}

            <div className="vendor-agenda-day-fill">
              {day.availableSpans.map((span) => (
                <div
                  key={span.id}
                  className={`vendor-agenda-availability-span source-${span.source}`}
                  style={getBlockStyle(span, agenda.timeBounds)}
                />
              ))}

              {day.blocks.map((block) => (
                <button
                  key={block.id}
                  type="button"
                  className={`vendor-agenda-block ${blockToneClass(block)} ${selectedBlockId === block.id ? "active" : ""}`}
                  style={getBlockStyle(block, agenda.timeBounds)}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectDate(day.date);
                    onSelectBlock(block.id);
                  }}
                >
                  <div className="vendor-agenda-block-text">
                    <span className="vendor-agenda-block-kicker">{blockKindLabel(block)}</span>
                    <strong>{block.title}</strong>
                    <span>{formatTimeRange(block)}</span>
                  </div>
                  {block.type === "booking" ? (
                    <span className="vendor-agenda-block-avatar">{getBlockAvatarLabel(block)}</span>
                  ) : null}
                  {block.type === "booking" && onViewBookingDetails && dashboardBookings?.length ? (
                    <button
                      type="button"
                      className="vendor-agenda-block-details"
                      onClick={(event) => {
                        event.stopPropagation();
                        const booking = dashboardBookings.find((b) => String(b.id) === String(block.details?.bookingId || block.id));
                        if (booking) onViewBookingDetails(booking);
                      }}
                      title="See details"
                      style={{
                        position: "absolute",
                        top: "4px",
                        right: "4px",
                        width: "20px",
                        height: "20px",
                        display: "grid",
                        placeItems: "center",
                        borderRadius: "4px",
                        border: "none",
                        background: "rgba(255,255,255,0.85)",
                        color: "#475569",
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        zIndex: 2,
                        padding: 0,
                      }}
                    >
                      i
                    </button>
                  ) : null}
                  {block.preview ? (
                    <div className="vendor-agenda-block-tooltip">
                      <strong>{block.preview.serviceName || block.preview.title || block.title}</strong>
                      <span>{block.preview.customerName || block.preview.note || blockKindLabel(block)}</span>
                      <span>{block.preview.timeLabel || formatTimeRange(block)}</span>
                    </div>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function VacationModal({
  open,
  monthKey,
  setMonthKey,
  bookings,
  overrides,
  blackoutDates,
  vacationDraft,
  setVacationDraft,
  onClose,
  onSave,
  saving,
  todayKey
}) {
  const days = useMemo(
    () =>
      buildVacationPickerDays({
        monthKey,
        bookings,
        overrides,
        blackoutDates,
        vacationDraft,
        todayKey
      }),
    [blackoutDates, bookings, monthKey, overrides, todayKey, vacationDraft]
  );
  const bookingCount = countBookingsInRange(bookings, vacationDraft.startDate, vacationDraft.endDate);

  if (!open) {
    return null;
  }

  function handlePickDate(dateKey) {
    setVacationDraft((current) => {
      const currentStart = normalizeDateOnly(current.startDate);
      const currentEnd = normalizeDateOnly(current.endDate || current.startDate);

      if (!currentStart) {
        return {
          ...current,
          startDate: dateKey,
          endDate: dateKey
        };
      }

      if (currentStart === currentEnd) {
        if (dateKey === currentStart) {
          return current;
        }

        if (dateKey < currentStart) {
          return {
            ...current,
            startDate: dateKey,
            endDate: currentStart
          };
        }

        return {
          ...current,
          endDate: dateKey
        };
      }

      return {
        ...current,
        startDate: dateKey,
        endDate: dateKey
      };
    });
  }

  return (
    <div className="vendor-availability-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="vendor-availability-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="vendor-availability-modal-head">
          <button type="button" className="vendor-availability-ghost-button" onClick={onClose}>
            <ChevronLeft size={18} />
          </button>
          <h4>Select a date</h4>
          <div />
        </div>

        <div className="vendor-availability-modal-body">
          <div className="vendor-availability-picker-head">
            <strong>{formatMonthLabel(monthKey)}</strong>
            <div className="vendor-availability-inline-actions">
              <button
                type="button"
                className="vendor-availability-ghost-button"
                onClick={() => setMonthKey((current) => addMonths(current, -1))}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                className="vendor-availability-ghost-button"
                onClick={() => setMonthKey((current) => addMonths(current, 1))}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="vendor-availability-picker-weekdays">
            {["S", "M", "T", "W", "T", "F", "S"].map((label, index) => (
              <span key={`${label}-${index}`}>{label}</span>
            ))}
          </div>

          <div className="vendor-availability-picker-grid">
            {days.map((day) => (
              <button
                key={day.dateKey}
                type="button"
                className={`vendor-availability-picker-day ${day.currentMonth ? "" : "is-outside"} ${day.isToday ? "is-today" : ""} ${day.inRange ? "is-in-range" : ""} ${day.isStart ? "is-start" : ""} ${day.isEnd ? "is-end" : ""}`}
                onClick={() => handlePickDate(day.dateKey)}
              >
                <span>{day.dayLabel}</span>
              </button>
            ))}
          </div>

          <div className="vendor-availability-vacation-summary">
            <div>
              <strong>Vacation start: {formatFullDate(vacationDraft.startDate)}</strong>
              <span>All day</span>
            </div>
            <div>
              <strong>Vacation end: {formatFullDate(vacationDraft.endDate || vacationDraft.startDate)}</strong>
              <span>All day</span>
            </div>
          </div>

          <label className="vendor-availability-field">
            <span>Internal note</span>
            <input
              className="form-control"
              placeholder="Family travel, wedding week, personal time..."
              value={vacationDraft.note}
              onChange={(event) =>
                setVacationDraft((current) => ({
                  ...current,
                  note: event.target.value
                }))
              }
            />
          </label>

          <div className="vendor-availability-vacation-notice">
            {bookingCount > 0 ? (
              <p>
                {bookingCount} booking{bookingCount === 1 ? "" : "s"} already exist in this vacation range. Clients
                will stop seeing these days as bookable, but you will need to cancel any existing bookings manually.
              </p>
            ) : (
              <p>
                This vacation will block new bookings for the selected days. Existing bookings are never cancelled
                automatically.
              </p>
            )}
          </div>
        </div>

        <div className="vendor-availability-modal-actions">
          <button
            type="button"
            className="vendor-availability-primary-button vendor-availability-primary-button-full"
            onClick={onSave}
            disabled={saving}
          >
            {saving ? <Loader2 className="animate-spin" size={16} /> : null}
            <span>{saving ? "Saving..." : "Save"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VendorAvailabilityAgenda({
  dashboard,
  user,
  availabilityForm,
  setAvailabilityForm,
  blackoutDatesText,
  onDashboardResponse,
  onStatusChange,
  onViewBookingDetails
}) {
  const todayKey = formatDateInputFallback(new Date().toISOString());
  const [activeTab, setActiveTab] = useState("calendar");
  const [calendarView, setCalendarView] = useState("week");
  const [referenceDate, setReferenceDate] = useState(todayKey);
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [selectedBlockId, setSelectedBlockId] = useState("");
  const [agenda, setAgenda] = useState(null);
  const [agendaLoading, setAgendaLoading] = useState(false);
  const [manageSaving, setManageSaving] = useState(false);
  const [manageDraft, setManageDraft] = useState(() => buildManageDraftFromRules(availabilityForm));
  const [manageTimezone, setManageTimezone] = useState(user?.timezone || "America/Los_Angeles");
  const [vacationModalOpen, setVacationModalOpen] = useState(false);
  const [vacationMonthKey, setVacationMonthKey] = useState(getMonthStartKey(todayKey));
  const [vacationDraft, setVacationDraft] = useState({
    startDate: todayKey,
    endDate: todayKey,
    note: ""
  });
  const [vacationSaving, setVacationSaving] = useState(false);
  const [vacationDeletingId, setVacationDeletingId] = useState("");
  const timezoneOptions = useMemo(
    () => [...new Set([user?.timezone, manageTimezone, ...COMMON_TIMEZONES].filter(Boolean))],
    [manageTimezone, user?.timezone]
  );
  const bookings = useMemo(() => dashboard.bookings || [], [dashboard.bookings]);
  const overrides = useMemo(
    () => dashboard.vendor.availabilityOverrides || [],
    [dashboard.vendor.availabilityOverrides]
  );
  const blackoutDates = useMemo(() => parseBlackoutDates(blackoutDatesText), [blackoutDatesText]);
  const refreshKey = useMemo(
    () =>
      [
        availabilitySignature(availabilityForm),
        blackoutDatesText,
        overrideSignature(overrides),
        bookingSignature(bookings)
      ].join("||"),
    [availabilityForm, blackoutDatesText, overrides, bookings]
  );
  const savedManageDays = useMemo(() => buildManageDraftFromRules(availabilityForm), [availabilityForm]);
  const vacations = useMemo(
    () =>
      [...overrides]
        .filter((override) => override.type === "reserve_full_day")
        .sort((left, right) => left.startDate.localeCompare(right.startDate)),
    [overrides]
  );
  const selectedDay = useMemo(() => {
    if (!agenda?.days?.length) {
      return null;
    }

    return (
      agenda.days.find((day) => day.date === selectedDate) ||
      agenda.days.find((day) => day.isToday) ||
      agenda.days[0]
    );
  }, [agenda, selectedDate]);
  useEffect(() => {
    setManageDraft(buildManageDraftFromRules(availabilityForm));
  }, [availabilityForm]);

  useEffect(() => {
    if (user?.timezone) {
      setManageTimezone(user.timezone);
    }
  }, [user?.timezone]);

  useEffect(() => {
    let cancelled = false;

    async function loadAgenda() {
      setAgendaLoading(true);

      try {
        const search = new URLSearchParams({
          view: calendarView,
          referenceDate
        });
        const response = await fetch(`/api/dashboard/availability/calendar?${search.toString()}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to load the calendar.");
        }

        if (!cancelled) {
          setAgenda(data);
        }
      } catch (error) {
        if (!cancelled) {
          setAgenda(null);
          onStatusChange({ type: "error", message: error.message });
        }
      } finally {
        if (!cancelled) {
          setAgendaLoading(false);
        }
      }
    }

    loadAgenda();

    return () => {
      cancelled = true;
    };
  }, [calendarView, onStatusChange, referenceDate, refreshKey]);

  useEffect(() => {
    if (!agenda?.days?.length) {
      return;
    }

    if (!agenda.days.some((day) => day.date === selectedDate)) {
      setSelectedDate(agenda.referenceDate || agenda.days[0].date);
    }
  }, [agenda, selectedDate]);

  useEffect(() => {
    if (!selectedDay?.blocks?.length) {
      setSelectedBlockId("");
      return;
    }

    if (!selectedDay.blocks.some((block) => String(block.id) === String(selectedBlockId))) {
      setSelectedBlockId(selectedDay.blocks[0].id);
    }
  }, [selectedBlockId, selectedDay]);

  function pushStatus(type, message) {
    onStatusChange({ type, message });
  }

  function updateManageDay(dayOfWeek, nextFields) {
    setManageDraft((current) =>
      current.map((day) =>
        Number(day.dayOfWeek) === Number(dayOfWeek)
          ? {
              ...day,
              ...nextFields
            }
          : day
      )
    );
  }

  function openVacationModal(seedDate = selectedDate || todayKey) {
    const safeDate = formatDateInputFallback(seedDate, todayKey);
    setVacationDraft({
      startDate: safeDate,
      endDate: safeDate,
      note: ""
    });
    setVacationMonthKey(getMonthStartKey(safeDate));
    setVacationModalOpen(true);
  }

  async function saveManageAvailability() {
    setManageSaving(true);
    pushStatus("", "");

    try {
      const nextRules = buildRulesFromManageDraft(manageDraft);
      const hasInvalidDay = manageDraft.some((day) => {
        if (!day.enabled) {
          return false;
        }

        const startMinutes = timeToMinutes(day.startTime);
        const endMinutes = timeToMinutes(day.endTime);

        if (startMinutes < 0 || endMinutes <= startMinutes) {
          return true;
        }

        if (!day.hasBreak) {
          return false;
        }

        const breakStartMinutes = timeToMinutes(day.breakStart);
        const breakEndMinutes = timeToMinutes(day.breakEnd);

        return !(
          breakStartMinutes > startMinutes &&
          breakEndMinutes > breakStartMinutes &&
          breakEndMinutes < endMinutes
        );
      });

      if (hasInvalidDay) {
        throw new Error("Each open day needs a valid start/end time, and breaks must stay inside those hours.");
      }

      const response = await fetch("/api/dashboard/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          availabilityRules: nextRules,
          blackoutDates: [...blackoutDates],
          timezone: manageTimezone
        })
      });

      await onDashboardResponse(response);
      setAvailabilityForm(
        nextRules.map((rule) => ({
          dayOfWeek: String(rule.dayOfWeek),
          startTime: rule.startTime,
          endTime: rule.endTime,
          slotMinutes: String(rule.slotMinutes),
          active: rule.active !== false
        }))
      );
      pushStatus("success", "Availability updated.");
    } catch (error) {
      pushStatus("error", error.message);
    } finally {
      setManageSaving(false);
    }
  }

  async function saveVacationRange() {
    setVacationSaving(true);
    pushStatus("", "");

    try {
      const response = await fetch("/api/dashboard/availability/overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "reserve_full_day",
          startDate: vacationDraft.startDate,
          endDate: vacationDraft.endDate || vacationDraft.startDate,
          note: vacationDraft.note
        })
      });

      await onDashboardResponse(response);
      setVacationModalOpen(false);
      setSelectedDate(vacationDraft.startDate);
      setReferenceDate(vacationDraft.startDate);
      pushStatus("success", "Vacation saved.");
    } catch (error) {
      pushStatus("error", error.message);
    } finally {
      setVacationSaving(false);
    }
  }

  async function deleteVacation(overrideId) {
    if (!overrideId) {
      return;
    }

    setVacationDeletingId(overrideId);
    pushStatus("", "");

    try {
      const response = await fetch("/api/dashboard/availability/overrides", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overrideId })
      });

      await onDashboardResponse(response);
      pushStatus("success", "Vacation removed.");
    } catch (error) {
      pushStatus("error", error.message);
    } finally {
      setVacationDeletingId("");
    }
  }

  return (
    <>
      <div className="vendor-dashboard-tab vendor-availability-shell">
        <div className="dashboard-card vendor-availability-frame">
          <aside className="vendor-availability-rail">
            <div className="vendor-dashboard-tabs">
              {INTERNAL_TABS.map((tab) => {
                const Icon = tab.icon;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    className={`vendor-dashboard-tab-item ${activeTab === tab.id ? "active" : ""}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <span className="vendor-availability-rail-tab-icon">
                      <Icon size={18} />
                    </span>
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="vendor-availability-stage">
            {activeTab === "calendar" ? (
              <div className="vendor-availability-stage-panel">
                <div className="vendor-availability-stage-head vendor-dashboard-header" style={{ marginBottom: 24 }}>
                  <div>
                    <h3 className="vendor-dashboard-header-title">{agenda?.rangeLabel || "Calendar"}</h3>
                    <p>See bookings, off times, vacations, and open slots in the same live calendar.</p>
                  </div>
                  <div className="vendor-availability-toolbar">
                    <button
                      type="button"
                      className="vendor-availability-today-button"
                      onClick={() => {
                        setSelectedDate(todayKey);
                        setReferenceDate(todayKey);
                      }}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      className="vendor-availability-ghost-button"
                      onClick={() =>
                        startTransition(() => setReferenceDate((current) => shiftReferenceDate(current, calendarView, -1)))
                      }
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      type="button"
                      className="vendor-availability-ghost-button"
                      onClick={() =>
                        startTransition(() => setReferenceDate((current) => shiftReferenceDate(current, calendarView, 1)))
                      }
                    >
                      <ChevronRight size={18} />
                    </button>
                    <select
                      className="form-control vendor-availability-view-select"
                      value={calendarView}
                      onChange={(event) =>
                        startTransition(() => {
                          setCalendarView(normalizeCalendarView(event.target.value));
                          setSelectedBlockId("");
                        })
                      }
                    >
                      {CALENDAR_VIEW_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="vendor-availability-calendar-layout">
                  <div className="vendor-availability-calendar-main">
                    {agendaLoading ? (
                      <div className="vendor-agenda-loading">
                        <Loader2 className="animate-spin" size={18} />
                        <span>Loading calendar...</span>
                      </div>
                    ) : (
                      <AgendaCalendarView
                        agenda={agenda}
                        selectedDate={selectedDate}
                        selectedBlockId={selectedBlockId}
                        dashboardBookings={bookings}
                        onSelectDate={(nextDate) => {
                          setSelectedDate(nextDate);
                          startTransition(() => setReferenceDate(nextDate));
                        }}
                        onSelectBlock={setSelectedBlockId}
                        onViewBookingDetails={onViewBookingDetails}
                      />
                    )}
                  </div>


                </div>
              </div>
            ) : null}

            {activeTab === "manage" ? (
              <div className="vendor-availability-stage-panel vendor-availability-manage-panel">
                <div className="vendor-availability-stage-head vendor-dashboard-header" style={{ marginBottom: 24 }}>
                  <div>
                    <h3 className="vendor-dashboard-header-title">Edit Availability</h3>
                    <p>Set weekly opening hours, choose 15-minute times, and add one break per day.</p>
                  </div>
                  <button
                    type="button"
                    className="vendor-availability-primary-button"
                    onClick={saveManageAvailability}
                    disabled={manageSaving}
                  >
                    {manageSaving ? <Loader2 className="animate-spin" size={16} /> : null}
                    <span>{manageSaving ? "Saving..." : "Save"}</span>
                  </button>
                </div>

                <div className="vendor-availability-manage-top">
                  <label className="vendor-availability-field">
                    <span>Timezone</span>
                    <select
                      className="form-control vendor-availability-timezone-select"
                      value={manageTimezone}
                      onChange={(event) => setManageTimezone(event.target.value)}
                    >
                      {timezoneOptions.map((timezone) => (
                        <option key={timezone} value={timezone}>
                          {timezone}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="vendor-availability-manage-list">
                  {manageDraft.map((day) => {
                    const startMinutes = timeToMinutes(day.startTime);
                    const endMinutes = timeToMinutes(day.endTime);
                    const canAddBreak = endMinutes - startMinutes >= 45;
                    const endOptions = filterTimeOptions({ min: startMinutes, exclusiveMin: true });
                    const breakStartOptions = filterTimeOptions({
                      min: startMinutes,
                      max: endMinutes,
                      exclusiveMin: true,
                      exclusiveMax: true
                    });
                    const breakEndOptions = filterTimeOptions({
                      min: timeToMinutes(day.breakStart),
                      max: endMinutes,
                      exclusiveMin: true,
                      exclusiveMax: true
                    });

                    return (
                      <div key={day.dayOfWeek} className="vendor-availability-manage-day">
                        <div className="vendor-availability-manage-day-head">
                          <h4>{MANAGE_WEEKDAY_ROWS.find((item) => item.value === day.dayOfWeek)?.label}</h4>
                          <button
                            type="button"
                            className={`vendor-availability-switch ${day.enabled ? "active" : ""}`}
                            aria-pressed={day.enabled}
                            onClick={() => updateManageDay(day.dayOfWeek, { enabled: !day.enabled })}
                          >
                            <span />
                          </button>
                        </div>

                        {day.enabled ? (
                          <div className="vendor-availability-manage-day-body">
                            <div className="vendor-availability-manage-grid">
                              <label className="vendor-availability-field">
                                <span>Start</span>
                                <TimeSelect
                                  value={day.startTime}
                                  options={START_TIME_OPTIONS}
                                  onChange={(event) =>
                                    updateManageDay(day.dayOfWeek, {
                                      startTime: event.target.value,
                                      endTime:
                                        timeToMinutes(day.endTime) <= timeToMinutes(event.target.value)
                                          ? filterTimeOptions({
                                              min: timeToMinutes(event.target.value),
                                              exclusiveMin: true
                                            })[0]?.value || "23:45"
                                          : day.endTime
                                    })
                                  }
                                />
                              </label>

                              <label className="vendor-availability-field">
                                <span>End</span>
                                <TimeSelect
                                  value={day.endTime}
                                  options={endOptions}
                                  onChange={(event) =>
                                    updateManageDay(day.dayOfWeek, {
                                      endTime: event.target.value
                                    })
                                  }
                                />
                              </label>
                            </div>

                            {day.hasBreak ? (
                              <>
                                <div className="vendor-availability-manage-break-title">Break</div>
                                <div className="vendor-availability-manage-grid">
                                  <label className="vendor-availability-field">
                                    <span>Break Start</span>
                                    <TimeSelect
                                      value={day.breakStart}
                                      options={breakStartOptions}
                                      onChange={(event) =>
                                        updateManageDay(day.dayOfWeek, {
                                          breakStart: event.target.value,
                                          breakEnd:
                                            timeToMinutes(day.breakEnd) <= timeToMinutes(event.target.value)
                                              ? filterTimeOptions({
                                                  min: timeToMinutes(event.target.value),
                                                  max: timeToMinutes(day.endTime),
                                                  exclusiveMin: true,
                                                  exclusiveMax: true
                                                })[0]?.value || day.endTime
                                              : day.breakEnd
                                        })
                                      }
                                    />
                                  </label>

                                  <label className="vendor-availability-field">
                                    <span>Break End</span>
                                    <TimeSelect
                                      value={day.breakEnd}
                                      options={breakEndOptions}
                                      onChange={(event) =>
                                        updateManageDay(day.dayOfWeek, {
                                          breakEnd: event.target.value
                                        })
                                      }
                                    />
                                  </label>
                                </div>

                                <button
                                  type="button"
                                  className="vendor-availability-remove-break"
                                  onClick={() =>
                                    updateManageDay(day.dayOfWeek, {
                                      hasBreak: false,
                                      breakStart: "12:00",
                                      breakEnd: "13:00"
                                    })
                                  }
                                >
                                  <Trash2 size={15} />
                                  <span>Remove Break</span>
                                </button>
                              </>
                            ) : canAddBreak ? (
                              <button
                                type="button"
                                className="vendor-availability-add-break"
                                onClick={() =>
                                  updateManageDay(day.dayOfWeek, {
                                    hasBreak: true,
                                    breakStart:
                                      filterTimeOptions({
                                        min: startMinutes,
                                        max: endMinutes,
                                        exclusiveMin: true,
                                        exclusiveMax: true
                                      })[0]?.value || day.startTime,
                                    breakEnd:
                                      filterTimeOptions({
                                        min: startMinutes + 15,
                                        max: endMinutes,
                                        exclusiveMin: true,
                                        exclusiveMax: true
                                      })[0]?.value || day.endTime
                                  })
                                }
                              >
                                <Plus size={15} />
                                <span>Add Break</span>
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {activeTab === "vacation" ? (
              <div className="vendor-availability-stage-panel vendor-availability-vacation-panel">
                <div className="vendor-availability-stage-head vendor-dashboard-header" style={{ marginBottom: 24 }}>
                  <div>
                    <h3 className="vendor-dashboard-header-title">Vacation Time</h3>
                    <p>Setting vacation time will block off your availability for the selected time span.</p>
                  </div>
                </div>

                <button
                  type="button"
                  className="vendor-availability-primary-button"
                  onClick={() => openVacationModal()}
                >
                  <Plus size={16} />
                  <span>Add New Vacation</span>
                </button>

                <div className="vendor-availability-vacation-listing">
                  <h4>Upcoming Time Off</h4>

                  {vacations.length ? (
                    <div className="vendor-availability-vacation-list">
                      {vacations.map((vacation) => {
                        const bookingCount = countBookingsInRange(bookings, vacation.startDate, vacation.endDate);

                        return (
                          <div key={vacation.id} className="vendor-availability-vacation-item">
                            <div>
                              <strong>Start: {formatFullDate(vacation.startDate)}</strong>
                              <strong>End: {formatFullDate(vacation.endDate)}</strong>
                              {vacation.note ? <span>{vacation.note}</span> : null}
                              {bookingCount > 0 ? (
                                <em>
                                  {bookingCount} existing booking{bookingCount === 1 ? "" : "s"} stay active until you cancel them manually.
                                </em>
                              ) : null}
                            </div>
                            <button
                              type="button"
                              className="vendor-availability-delete-link"
                              disabled={vacationDeletingId === vacation.id}
                              onClick={() => deleteVacation(vacation.id)}
                            >
                              {vacationDeletingId === vacation.id ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="vendor-availability-empty-copy">You have no upcoming time off scheduled.</p>
                  )}
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </div>

      <VacationModal
        open={vacationModalOpen}
        monthKey={vacationMonthKey}
        setMonthKey={setVacationMonthKey}
        bookings={bookings}
        overrides={overrides}
        blackoutDates={blackoutDates}
        vacationDraft={vacationDraft}
        setVacationDraft={setVacationDraft}
        onClose={() => setVacationModalOpen(false)}
        onSave={saveVacationRange}
        saving={vacationSaving}
        todayKey={todayKey}
      />
    </>
  );
}
