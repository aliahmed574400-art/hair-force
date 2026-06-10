const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const agendaWeekdayLabels = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const overrideTypes = new Set(["reserve_full_day", "off_time", "extra_hours"]);

function pad(value) {
  return String(value).padStart(2, "0");
}

function parseTimeString(value) {
  const [hours = "0", minutes = "0"] = String(value || "00:00").split(":");
  return {
    hours: Number(hours),
    minutes: Number(minutes)
  };
}

function parseTimeToMinutes(value) {
  const normalized = normalizeClockTime(value);

  if (!normalized) {
    return null;
  }

  const { hours, minutes } = parseTimeString(normalized);
  return hours * 60 + minutes;
}

function formatDisplayTime(hours, minutes) {
  const period = hours >= 12 ? "PM" : "AM";
  const normalized = hours % 12 || 12;
  return `${normalized}:${pad(minutes)} ${period}`;
}

function formatMinutesToDisplay(minutes) {
  const normalized = ((Number(minutes || 0) % 1440) + 1440) % 1440;
  return formatDisplayTime(Math.floor(normalized / 60), normalized % 60);
}

function formatMinutesToTime(minutes) {
  const normalized = Math.max(0, Math.min(24 * 60, Number(minutes || 0)));

  if (normalized >= 24 * 60) {
    return "24:00";
  }

  return `${pad(Math.floor(normalized / 60))}:${pad(normalized % 60)}`;
}

function formatGridHourLabel(minutes) {
  const normalized = Math.max(0, Math.min(23 * 60 + 59, Number(minutes || 0)));
  const hours = Math.floor(normalized / 60);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours} ${period}`;
}

function addMinutesToTime(timeString, minutesToAdd) {
  const { hours, minutes } = parseTimeString(timeString);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  date.setMinutes(date.getMinutes() + Number(minutesToAdd || 0));
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function createDateOnly(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 12));
  }

  const input = String(value || "").trim().slice(0, 10);
  const match = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return null;
  }

  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeDateOnly(value) {
  const date = createDateOnly(value);
  return date ? date.toISOString().slice(0, 10) : "";
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + Number(days || 0));
  return next;
}

function getWeekStart(date) {
  const mondayOffset = (date.getUTCDay() + 6) % 7;
  return addDays(date, -mondayOffset);
}

function getSundayWeekStart(date) {
  return addDays(date, -date.getUTCDay());
}

function getMonthStart(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 12));
}

function formatUtcDate(date, options) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    ...options
  }).format(date);
}

function getDatePartsInTimezone(timezone = "UTC") {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());

  return parts.reduce((result, part) => {
    if (part.type !== "literal") {
      result[part.type] = part.value;
    }

    return result;
  }, {});
}

function getTodayKey(timezone = "UTC") {
  const parts = getDatePartsInTimezone(timezone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function normalizeClockTime(value) {
  const input = String(value || "").trim();

  if (!input) {
    return "";
  }

  if (/^\d{2}:\d{2}$/.test(input)) {
    return input;
  }

  if (/^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(input)) {
    return toTwentyFourHour(input);
  }

  return "";
}

function createAvailabilityOverrideId() {
  return `avo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function isDateWithinOverride(dateKey, override) {
  return Boolean(dateKey) && dateKey >= override.startDate && dateKey <= override.endDate;
}

function buildWeekDates(targetDate) {
  const normalizedTarget = createDateOnly(targetDate);

  if (!normalizedTarget) {
    return [];
  }

  const start = getWeekStart(normalizedTarget);
  return Array.from({ length: 7 }, (_, index) => normalizeDateOnly(addDays(start, index)));
}

function copyOverrideToDate(override, targetDate) {
  return {
    ...override,
    id: createAvailabilityOverrideId(),
    startDate: targetDate,
    endDate: targetDate,
    updatedAt: new Date().toISOString()
  };
}

function diffBetweenTimes(start, end) {
  const startParts = parseTimeString(start);
  const endParts = parseTimeString(end);
  return Math.max(
    30,
    endParts.hours * 60 + endParts.minutes - (startParts.hours * 60 + startParts.minutes)
  );
}

function buildWindowLabel(date) {
  return `${dayLabels[date.getUTCDay()]}, ${pad(date.getUTCDate())} ${formatUtcDate(date, {
    month: "short"
  })}`;
}

function buildAgendaDayLabel(date) {
  return {
    weekdayShort: formatUtcDate(date, { weekday: "short" }),
    weekdayLong: agendaWeekdayLabels[(date.getUTCDay() + 6) % 7],
    monthShort: formatUtcDate(date, { month: "short" }),
    dayNumber: pad(date.getUTCDate())
  };
}

function normalizeAgendaView(view) {
  const normalized = String(view || "week").trim().toLowerCase();

  if (normalized === "month") {
    return "month";
  }

  if (normalized === "day" || normalized === "1day" || normalized === "1-day") {
    return "day";
  }

  if (
    normalized === "3days" ||
    normalized === "3day" ||
    normalized === "3-days" ||
    normalized === "3-day"
  ) {
    return "3days";
  }

  return "week";
}

function sortTimeStrings(left, right) {
  return (parseTimeToMinutes(left) || 0) - (parseTimeToMinutes(right) || 0);
}

function generateSlotsFromSegments(segments = []) {
  return [...new Set(
    segments.flatMap((segment) => {
      const slots = [];
      let cursor = segment.startMinutes;
      const step = Math.max(15, Number(segment.slotMinutes || 60));

      while (cursor + step <= segment.endMinutes) {
        slots.push(formatMinutesToDisplay(cursor));
        cursor += step;
      }

      return slots;
    })
  )].sort(sortTimeStrings);
}

function subtractIntervalFromSegments(segments = [], blockedIntervals = []) {
  return blockedIntervals.reduce((currentSegments, blocked) => {
    return currentSegments.flatMap((segment) => {
      if (
        blocked.endMinutes <= segment.startMinutes ||
        blocked.startMinutes >= segment.endMinutes
      ) {
        return [segment];
      }

      const nextSegments = [];

      if (blocked.startMinutes > segment.startMinutes) {
        nextSegments.push({
          ...segment,
          endMinutes: blocked.startMinutes
        });
      }

      if (blocked.endMinutes < segment.endMinutes) {
        nextSegments.push({
          ...segment,
          startMinutes: blocked.endMinutes
        });
      }

      return nextSegments.filter((item) => item.endMinutes > item.startMinutes);
    });
  }, segments);
}

function mergeTouchingSegments(segments = []) {
  const sorted = [...segments].sort((left, right) => left.startMinutes - right.startMinutes);

  return sorted.reduce((merged, segment) => {
    const current = merged[merged.length - 1];

    if (
      current &&
      current.endMinutes >= segment.startMinutes &&
      current.slotMinutes === segment.slotMinutes &&
      current.source === segment.source
    ) {
      current.endMinutes = Math.max(current.endMinutes, segment.endMinutes);
      return merged;
    }

    merged.push({ ...segment });
    return merged;
  }, []);
}

function parseServiceDurationMinutes(value) {
  const input = String(value || "").trim().toLowerCase();

  if (!input) {
    return 60;
  }

  const hourMatches = [...input.matchAll(/(\d+)\s*h(?:r|our)?s?/g)];
  const minuteMatches = [...input.matchAll(/(\d+)\s*m(?:in|ins|inute)?s?/g)];

  const hours = hourMatches.reduce((sum, match) => sum + Number(match[1] || 0), 0);
  const minutes = minuteMatches.reduce((sum, match) => sum + Number(match[1] || 0), 0);
  const total = hours * 60 + minutes;

  if (total > 0) {
    return total;
  }

  const numericMinutes = Number.parseInt(input, 10);
  return Number.isFinite(numericMinutes) && numericMinutes > 0 ? numericMinutes : 60;
}

function bookingBlocksAvailability(booking) {
  const normalized = String(booking?.status || "").toLowerCase();
  return !["cancelled", "declined"].includes(normalized);
}

function bookingTone(status) {
  if (status === "pending_approval") {
    return "warning";
  }

  if (status === "completed") {
    return "muted";
  }

  return "booking";
}

function getMatchingRuleSegments(date, availabilityRules = []) {
  return availabilityRules
    .filter((rule) => rule.active !== false && Number(rule.dayOfWeek) === date.getUTCDay())
    .map((rule, index) => {
      const startMinutes = parseTimeToMinutes(rule.startTime);
      const endMinutes = parseTimeToMinutes(rule.endTime);

      if (startMinutes === null || endMinutes === null || startMinutes >= endMinutes) {
        return null;
      }

      return {
        id: `rule-${date.toISOString()}-${index}`,
        source: "rule",
        startMinutes,
        endMinutes,
        slotMinutes: Math.max(15, Number(rule.slotMinutes || 60))
      };
    })
    .filter(Boolean);
}

function getMatchingOverrides(dateKey, availabilityOverrides = []) {
  return availabilityOverrides.filter((override) => isDateWithinOverride(dateKey, override));
}

function buildAvailabilityForDate({
  date,
  availabilityRules = [],
  blackoutDates = [],
  availabilityOverrides = [],
  bookings = [],
  servicesById = new Map(),
  todayKey = ""
}) {
  const dateKey = normalizeDateOnly(date);
  const dayMeta = buildAgendaDayLabel(date);
  const matchingOverrides = getMatchingOverrides(dateKey, availabilityOverrides);
  const reserveOverrides = matchingOverrides.filter((override) => override.type === "reserve_full_day");
  const offTimeOverrides = matchingOverrides.filter((override) => override.type === "off_time");
  const extraHourOverrides = matchingOverrides.filter((override) => override.type === "extra_hours");
  const isLegacyBlackout = blackoutDates.includes(dateKey);
  const reservedAllDay = isLegacyBlackout || reserveOverrides.length > 0;
  const baseSegments = getMatchingRuleSegments(date, availabilityRules);
  const extraSegments = extraHourOverrides
    .map((override) => {
      const startMinutes = parseTimeToMinutes(override.startTime);
      const endMinutes = parseTimeToMinutes(override.endTime);

      if (startMinutes === null || endMinutes === null || startMinutes >= endMinutes) {
        return null;
      }

      return {
        id: override.id,
        source: "extra_hours",
        startMinutes,
        endMinutes,
        slotMinutes: Math.max(15, Number(override.slotMinutes || 60)),
        note: override.note
      };
    })
    .filter(Boolean);

  const blockedIntervals = offTimeOverrides
    .map((override) => {
      const startMinutes = parseTimeToMinutes(override.startTime);
      const endMinutes = parseTimeToMinutes(override.endTime);

      if (startMinutes === null || endMinutes === null || startMinutes >= endMinutes) {
        return null;
      }

      return {
        id: override.id,
        startMinutes,
        endMinutes,
        note: override.note
      };
    })
    .filter(Boolean);

  const freeSegments = reservedAllDay
    ? []
    : mergeTouchingSegments(subtractIntervalFromSegments([...baseSegments, ...extraSegments], blockedIntervals));
  const freeSlots = generateSlotsFromSegments(freeSegments);
  const dayBookings = bookings
    .filter((booking) => bookingBlocksAvailability(booking) && normalizeDateOnly(booking.appointmentDate) === dateKey)
    .map((booking) => {
      const service = servicesById.get(String(booking.serviceId || ""));
      const startMinutes = parseTimeToMinutes(booking.appointmentSlot);
      const fallbackStep =
        freeSegments.find((segment) => segment.startMinutes === startMinutes)?.slotMinutes || 60;
      const durationMinutes = Math.max(
        15,
        parseServiceDurationMinutes(service?.duration || booking.duration || "") || fallbackStep
      );
      const safeStart = startMinutes ?? 0;
      const safeEnd = Math.min(24 * 60, safeStart + durationMinutes);

      return {
        id: booking.id,
        type: "booking",
        tone: bookingTone(booking.status),
        title: booking.serviceName || service?.title || "Booked appointment",
        startTime: formatMinutesToTime(safeStart),
        endTime: formatMinutesToTime(safeEnd),
        startMinutes: safeStart,
        endMinutes: safeEnd,
        preview: {
          customerName: booking.customerName || "Client",
          serviceName: booking.serviceName || service?.title || "Booked appointment",
          status: booking.status || "confirmed",
          timeLabel: booking.appointmentSlot || formatMinutesToDisplay(safeStart),
          amount: Number(booking.total || 0)
        },
        details: {
          bookingId: booking.id,
          customerName: booking.customerName || "Client",
          customerEmail: booking.customerEmail || "",
          customerPhone: booking.customerPhone || "",
          serviceName: booking.serviceName || service?.title || "Booked appointment",
          status: booking.status || "confirmed",
          appointmentDate: dateKey,
          appointmentSlot: booking.appointmentSlot || formatMinutesToDisplay(safeStart),
          total: Number(booking.total || 0),
          notes: booking.notes || ""
        }
      };
    });

  const overrideBlocks = [
    ...(isLegacyBlackout
      ? [
          {
            id: `legacy-blackout-${dateKey}`,
            type: "reserve_full_day",
            tone: "reserved",
            title: "Reserved day",
            startTime: "00:00",
            endTime: "24:00",
            startMinutes: 0,
            endMinutes: 24 * 60,
            isAllDay: true,
            preview: {
              title: "Reserved day",
              note: "Legacy blackout date"
            }
          }
        ]
      : []),
    ...reserveOverrides.map((override) => ({
      id: override.id,
      type: "reserve_full_day",
      tone: "reserved",
      title: override.note || "Reserved day",
      startTime: "00:00",
      endTime: "24:00",
      startMinutes: 0,
      endMinutes: 24 * 60,
      isAllDay: true,
      preview: {
        title: override.note || "Reserved day",
        note: override.note || ""
      }
    })),
    ...offTimeOverrides
      .map((override) => {
        const startMinutes = parseTimeToMinutes(override.startTime);
        const endMinutes = parseTimeToMinutes(override.endTime);

        if (startMinutes === null || endMinutes === null || startMinutes >= endMinutes) {
          return null;
        }

        return {
          id: override.id,
          type: "off_time",
          tone: "off_time",
          title: override.note || "Off time",
          startTime: override.startTime,
          endTime: override.endTime,
          startMinutes,
          endMinutes,
          preview: {
            title: override.note || "Off time",
            note: override.note || ""
          }
        };
      })
      .filter(Boolean),
    ...extraHourOverrides
      .map((override) => {
        const startMinutes = parseTimeToMinutes(override.startTime);
        const endMinutes = parseTimeToMinutes(override.endTime);

        if (startMinutes === null || endMinutes === null || startMinutes >= endMinutes) {
          return null;
        }

        return {
          id: override.id,
          type: "extra_hours",
          tone: "extra_hours",
          title: override.note || "Extra hours",
          startTime: override.startTime,
          endTime: override.endTime,
          startMinutes,
          endMinutes,
          preview: {
            title: override.note || "Extra hours",
            note: override.note || ""
          }
        };
      })
      .filter(Boolean)
  ];

  const blocks = [...overrideBlocks, ...dayBookings].sort(
    (left, right) => left.startMinutes - right.startMinutes
  );
  const availableSpans = freeSegments.map((segment, index) => ({
    id: `${dateKey}-span-${index}`,
    source: segment.source,
    startTime: formatMinutesToTime(segment.startMinutes),
    endTime: formatMinutesToTime(segment.endMinutes),
    startMinutes: segment.startMinutes,
    endMinutes: segment.endMinutes,
    slotMinutes: segment.slotMinutes,
    slotCount: generateSlotsFromSegments([segment]).length,
    note: segment.note || ""
  }));
  const status = reservedAllDay
    ? "reserved"
    : dayBookings.length && freeSlots.length
      ? "mixed"
      : dayBookings.length
        ? "booked"
        : freeSlots.length
          ? "available"
          : "closed";

  return {
    date: dateKey,
    label: `${dayMeta.weekdayShort}, ${dayMeta.dayNumber} ${dayMeta.monthShort}`,
    weekdayShort: dayMeta.weekdayShort,
    weekdayLong: dayMeta.weekdayLong,
    dayNumber: dayMeta.dayNumber,
    monthShort: dayMeta.monthShort,
    isToday: dateKey === todayKey,
    isCurrentMonth: false,
    freeSlots,
    slotCount: freeSlots.length,
    availableSpans,
    blocks,
    bookingCount: dayBookings.length,
    status,
    hasFullDayReserve: reservedAllDay
  };
}

function buildVisibleTimeBounds(days = []) {
  const values = days.flatMap((day) => [
    ...day.availableSpans.flatMap((span) => [span.startMinutes, span.endMinutes]),
    ...day.blocks
      .filter((block) => !block.isAllDay)
      .flatMap((block) => [block.startMinutes, block.endMinutes])
  ]);

  if (!values.length) {
    return {
      startMinutes: 8 * 60,
      endMinutes: 18 * 60
    };
  }

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const startMinutes = Math.max(6 * 60, Math.floor(minValue / 60) * 60 - 60);
  const endMinutes = Math.min(22 * 60, Math.ceil(maxValue / 60) * 60 + 60);

  return {
    startMinutes,
    endMinutes: Math.max(startMinutes + 60, endMinutes)
  };
}

function buildTimeLabels(timeBounds) {
  const labels = [];

  for (let current = timeBounds.startMinutes; current <= timeBounds.endMinutes; current += 60) {
    labels.push({
      minutes: current,
      time: formatMinutesToTime(current),
      label: formatGridHourLabel(current)
    });
  }

  return labels;
}

export function createDefaultAvailabilityRules() {
  return [
    { dayOfWeek: 1, startTime: "10:00", endTime: "18:00", slotMinutes: 120, active: true },
    { dayOfWeek: 3, startTime: "10:00", endTime: "18:00", slotMinutes: 120, active: true },
    { dayOfWeek: 5, startTime: "11:00", endTime: "19:00", slotMinutes: 120, active: true }
  ];
}

export function deriveRulesFromBookingWindows(windows = []) {
  const seen = new Set();

  const derived = windows
    .map((window) => {
      const date = createDateOnly(window.date);

      if (!date || !window.slots?.length) {
        return null;
      }

      const dayOfWeek = date.getUTCDay();

      if (seen.has(dayOfWeek)) {
        return null;
      }

      seen.add(dayOfWeek);
      const startTime = toTwentyFourHour(window.slots[0]);
      const slotMinutes = window.slots[1]
        ? diffBetweenTimes(toTwentyFourHour(window.slots[0]), toTwentyFourHour(window.slots[1]))
        : 120;
      const endTime = addMinutesToTime(
        toTwentyFourHour(window.slots[window.slots.length - 1]),
        slotMinutes
      );

      return {
        dayOfWeek,
        startTime,
        endTime,
        slotMinutes,
        active: true
      };
    })
    .filter(Boolean);

  return derived.length ? derived : createDefaultAvailabilityRules();
}

export function toTwentyFourHour(value) {
  const input = String(value || "").trim();

  if (/^\d{2}:\d{2}$/.test(input)) {
    return input;
  }

  const match = input.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (!match) {
    return "10:00";
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3].toUpperCase();

  if (period === "PM" && hours < 12) {
    hours += 12;
  }

  if (period === "AM" && hours === 12) {
    hours = 0;
  }

  return `${pad(hours)}:${pad(minutes)}`;
}

export function normalizeAvailabilityOverrides(payload = []) {
  return (Array.isArray(payload) ? payload : [])
    .map((override) => {
      const type = overrideTypes.has(String(override.type || "").trim())
        ? String(override.type).trim()
        : "";
      const startDate = normalizeDateOnly(override.startDate || override.date);
      const endDate = normalizeDateOnly(override.endDate || override.startDate || override.date);
      const startTime = normalizeClockTime(override.startTime);
      const endTime = normalizeClockTime(override.endTime);
      const slotMinutes = Number(override.slotMinutes || 0);
      const note = String(override.note || "").trim();
      const normalized = {
        id: String(override.id || createAvailabilityOverrideId()),
        type,
        startDate,
        endDate: endDate || startDate,
        startTime,
        endTime,
        slotMinutes: type === "extra_hours" ? Math.max(15, slotMinutes || 60) : 0,
        note,
        createdAt: String(override.createdAt || ""),
        updatedAt: String(override.updatedAt || "")
      };

      if (!normalized.type || !normalized.startDate || !normalized.endDate) {
        return null;
      }

      if (normalized.endDate < normalized.startDate) {
        return null;
      }

      if (normalized.type === "reserve_full_day") {
        return normalized;
      }

      if (!normalized.startTime || !normalized.endTime || normalized.startTime >= normalized.endTime) {
        return null;
      }

      return normalized;
    })
    .filter(Boolean)
    .sort((left, right) => {
      if (left.startDate !== right.startDate) {
        return left.startDate.localeCompare(right.startDate);
      }

      const leftMinutes = parseTimeToMinutes(left.startTime) ?? 0;
      const rightMinutes = parseTimeToMinutes(right.startTime) ?? 0;
      return leftMinutes - rightMinutes;
    });
}

export function buildBookingWindowsFromRules(
  availabilityRules = [],
  blackoutDates = [],
  daysAhead = 21,
  maxWindows = 6,
  options = {}
) {
  const activeRules = availabilityRules.filter((rule) => rule.active);

  if (!activeRules.length) {
    return [];
  }

  const blocked = new Set(blackoutDates.map((item) => String(item)));
  const availabilityOverrides = normalizeAvailabilityOverrides(options.availabilityOverrides);
  const startDate =
    createDateOnly(options.startDate || getTodayKey(options.timezone || "UTC")) ||
    createDateOnly(getTodayKey(options.timezone || "UTC"));
  const results = [];

  for (let offset = 0; offset <= Number(daysAhead || 0); offset += 1) {
    const current = addDays(startDate, offset);
    const day = buildAvailabilityForDate({
      date: current,
      availabilityRules: activeRules,
      blackoutDates: [...blocked],
      availabilityOverrides,
      bookings: [],
      todayKey: normalizeDateOnly(startDate)
    });

    if (!day.freeSlots.length) {
      continue;
    }

    results.push({
      date: day.date,
      label: buildWindowLabel(current),
      slots: day.freeSlots
    });

    if (results.length >= Number(maxWindows || 0)) {
      return results;
    }
  }

  return results;
}

export function buildAvailabilityAgenda({
  availabilityRules = [],
  blackoutDates = [],
  availabilityOverrides = [],
  bookings = [],
  services = [],
  referenceDate = "",
  view = "week",
  timezone = "UTC"
} = {}) {
  const todayKey = getTodayKey(timezone);
  const reference =
    createDateOnly(referenceDate || todayKey) ||
    createDateOnly(todayKey) ||
    new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate(), 12));
  const normalizedOverrides = normalizeAvailabilityOverrides(availabilityOverrides);
  const servicesById = new Map(
    (Array.isArray(services) ? services : []).map((service) => [String(service.id || ""), service])
  );
  const normalizedView = normalizeAgendaView(view);
  const rangeStart =
    normalizedView === "month"
      ? getSundayWeekStart(getMonthStart(reference))
      : normalizedView === "week"
        ? getSundayWeekStart(reference)
        : reference;
  const dayCount =
    normalizedView === "month" ? 42 : normalizedView === "day" ? 1 : normalizedView === "3days" ? 3 : 7;
  const days = Array.from({ length: dayCount }, (_, index) => {
    const date = addDays(rangeStart, index);
    const day = buildAvailabilityForDate({
      date,
      availabilityRules,
      blackoutDates,
      availabilityOverrides: normalizedOverrides,
      bookings,
      servicesById,
      todayKey
    });

    return {
      ...day,
      isCurrentMonth: date.getUTCMonth() === reference.getUTCMonth()
    };
  });
  const rangeEnd = addDays(rangeStart, dayCount - 1);
  const timeBounds = buildVisibleTimeBounds(days);

  return {
    view: normalizedView,
    timezone,
    referenceDate: normalizeDateOnly(reference),
    rangeStart: normalizeDateOnly(rangeStart),
    rangeEnd: normalizeDateOnly(rangeEnd),
    rangeLabel:
      normalizedView === "month"
        ? formatUtcDate(reference, { month: "long", year: "numeric" })
        : normalizedView === "day"
          ? formatUtcDate(reference, {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric"
            })
        : `${formatUtcDate(rangeStart, { month: "short", day: "numeric" })} - ${formatUtcDate(rangeEnd, {
            month: "short",
            day: "numeric",
            year: "numeric"
          })}`,
    timeBounds,
    timeLabels: buildTimeLabels(timeBounds),
    days
  };
}

export function copyAvailabilityOverrides(overrides = [], options = {}) {
  const normalizedOverrides = normalizeAvailabilityOverrides(overrides);
  const sourceDate = normalizeDateOnly(options.sourceDate);
  const mode = options.mode === "week" ? "week" : "day";
  const targetDates =
    mode === "week"
      ? buildWeekDates(options.targetDate || options.targetWeekStart)
      : [normalizeDateOnly(options.targetDate)].filter(Boolean);

  if (!sourceDate || !targetDates.length) {
    return normalizedOverrides;
  }

  const sourceOverrides = normalizedOverrides.filter((override) => isDateWithinOverride(sourceDate, override));

  if (!sourceOverrides.length) {
    return normalizedOverrides;
  }

  const nextOverrides = normalizedOverrides.filter(
    (override) => !targetDates.some((targetDate) => isDateWithinOverride(targetDate, override))
  );

  const copiedOverrides = targetDates.flatMap((targetDate) =>
    sourceOverrides.map((override) => copyOverrideToDate(override, targetDate))
  );

  return normalizeAvailabilityOverrides([...nextOverrides, ...copiedOverrides]);
}

export { normalizeDateOnly, parseServiceDurationMinutes };
