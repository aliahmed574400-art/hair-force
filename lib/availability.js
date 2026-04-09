const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

function formatDisplayTime(hours, minutes) {
  const period = hours >= 12 ? "PM" : "AM";
  const normalized = hours % 12 || 12;
  return `${normalized}:${pad(minutes)} ${period}`;
}

function addMinutesToTime(timeString, minutesToAdd) {
  const { hours, minutes } = parseTimeString(timeString);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  date.setMinutes(date.getMinutes() + Number(minutesToAdd || 0));
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
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
      const date = new Date(window.date);

      if (Number.isNaN(date.getTime()) || !window.slots?.length) {
        return null;
      }

      const dayOfWeek = date.getDay();

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

function diffBetweenTimes(start, end) {
  const startParts = parseTimeString(start);
  const endParts = parseTimeString(end);
  return Math.max(
    30,
    endParts.hours * 60 + endParts.minutes - (startParts.hours * 60 + startParts.minutes)
  );
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

export function buildBookingWindowsFromRules(
  availabilityRules = [],
  blackoutDates = [],
  daysAhead = 21,
  maxWindows = 6
) {
  const activeRules = availabilityRules.filter((rule) => rule.active);

  if (!activeRules.length) {
    return [];
  }

  const blocked = new Set(blackoutDates.map((item) => String(item)));
  const results = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  for (let offset = 0; offset <= daysAhead; offset += 1) {
    const current = new Date(now);
    current.setDate(now.getDate() + offset);

    const isoDate = current.toISOString().slice(0, 10);

    if (blocked.has(isoDate)) {
      continue;
    }

    const matchingRules = activeRules.filter((rule) => Number(rule.dayOfWeek) === current.getDay());

    for (const rule of matchingRules) {
      const slots = [];
      let cursor = rule.startTime;

      while (cursor < rule.endTime) {
        slots.push(formatDisplayTime(...Object.values(parseTimeString(cursor))));
        cursor = addMinutesToTime(cursor, Number(rule.slotMinutes || 60));
      }

      if (!slots.length) {
        continue;
      }

      results.push({
        date: isoDate,
        label: `${dayLabels[current.getDay()]} ${pad(current.getDate())} ${current.toLocaleString("en-US", {
          month: "short"
        })}`,
        slots
      });

      if (results.length >= maxWindows) {
        return results;
      }
    }
  }

  return results;
}
