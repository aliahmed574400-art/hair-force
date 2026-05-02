import assert from "node:assert/strict";
import {
  buildAvailabilityAgenda,
  buildBookingWindowsFromRules,
  copyAvailabilityOverrides,
  normalizeAvailabilityOverrides
} from "../lib/availability.js";

const baseRules = [
  {
    dayOfWeek: 1,
    startTime: "10:00",
    endTime: "14:00",
    slotMinutes: 60,
    active: true
  }
];

const services = [
  {
    id: "srv-1",
    title: "Signature Haircut",
    duration: "60 min"
  }
];

const normalizedOverrides = normalizeAvailabilityOverrides([
  {
    id: "avo-off",
    type: "off_time",
    startDate: "2026-05-04",
    endDate: "2026-05-04",
    startTime: "11:00",
    endTime: "12:00",
    note: "Break"
  },
  {
    id: "avo-extra",
    type: "extra_hours",
    startDate: "2026-05-04",
    endDate: "2026-05-04",
    startTime: "16:00",
    endTime: "18:00",
    slotMinutes: 60,
    note: "Late opening"
  }
]);

const windows = buildBookingWindowsFromRules(baseRules, [], 2, 6, {
  startDate: "2026-05-04",
  availabilityOverrides: normalizedOverrides
});

assert.deepEqual(windows, [
  {
    date: "2026-05-04",
    label: "Mon 04 May",
    slots: ["10:00 AM", "12:00 PM", "1:00 PM", "4:00 PM", "5:00 PM"]
  }
]);

const reserveAgenda = buildAvailabilityAgenda({
  availabilityRules: baseRules,
  blackoutDates: [],
  availabilityOverrides: normalizeAvailabilityOverrides([
    {
      id: "avo-reserve",
      type: "reserve_full_day",
      startDate: "2026-05-04",
      endDate: "2026-05-04",
      note: "Private event"
    }
  ]),
  bookings: [
    {
      id: "bk-1",
      customerName: "Aisha",
      customerEmail: "aisha@example.com",
      serviceId: "srv-1",
      serviceName: "Signature Haircut",
      appointmentDate: "2026-05-04",
      appointmentSlot: "10:00 AM",
      status: "confirmed",
      total: 85
    }
  ],
  services,
  referenceDate: "2026-05-04",
  view: "week",
  timezone: "America/Los_Angeles"
});

const monday = reserveAgenda.days.find((day) => day.date === "2026-05-04");

assert.equal(Boolean(monday), true);
assert.equal(monday.freeSlots.length, 0);
assert.equal(
  monday.blocks.some((block) => block.type === "reserve_full_day"),
  true
);
assert.equal(
  monday.blocks.some(
    (block) =>
      block.type === "booking" &&
      block.preview?.customerName === "Aisha" &&
      block.preview?.serviceName === "Signature Haircut"
  ),
  true
);

const copiedOverrides = copyAvailabilityOverrides(
  normalizeAvailabilityOverrides([
    {
      id: "avo-source-break",
      type: "off_time",
      startDate: "2026-05-04",
      endDate: "2026-05-04",
      startTime: "12:00",
      endTime: "13:00",
      note: "Lunch"
    }
  ]),
  {
    sourceDate: "2026-05-04",
    mode: "day",
    targetDate: "2026-05-06"
  }
);

assert.equal(copiedOverrides.length, 2);
const copiedTarget = copiedOverrides.find((override) => override.startDate === "2026-05-06");
assert.equal(Boolean(copiedTarget), true);
assert.equal(copiedTarget.endDate, "2026-05-06");
assert.equal(copiedTarget.startTime, "12:00");
assert.equal(copiedTarget.endTime, "13:00");

const singleDayAgenda = buildAvailabilityAgenda({
  availabilityRules: baseRules,
  referenceDate: "2026-05-04",
  view: "day",
  timezone: "America/Los_Angeles"
});

assert.equal(singleDayAgenda.view, "day");
assert.equal(singleDayAgenda.days.length, 1);
assert.equal(singleDayAgenda.days[0].date, "2026-05-04");

const threeDayAgenda = buildAvailabilityAgenda({
  availabilityRules: baseRules,
  referenceDate: "2026-05-04",
  view: "3days",
  timezone: "America/Los_Angeles"
});

assert.equal(threeDayAgenda.view, "3days");
assert.equal(threeDayAgenda.days.length, 3);
assert.deepEqual(
  threeDayAgenda.days.map((day) => day.date),
  ["2026-05-04", "2026-05-05", "2026-05-06"]
);

console.log("availability agenda checks passed");
