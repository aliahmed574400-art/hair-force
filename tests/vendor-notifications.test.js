import assert from "node:assert/strict";
import { getDemoStore } from "../lib/demo-store.js";
import {
  createBooking,
  createVendorNotification,
  getDashboardDataForUser,
  getStylistAvailability,
  listVendorNotificationsForUser,
  markAllVendorNotificationsRead,
  sendBookingMessage
} from "../lib/postgres-repositories.js";

const store = getDemoStore();
const vendorUser = store.users.find((user) => user.role === "vendor");
const clientUser = store.users.find((user) => user.role === "client");

assert.ok(vendorUser, "Expected a demo vendor user.");
assert.ok(clientUser, "Expected a demo client user.");

store.vendorNotifications = [];

let preview = await listVendorNotificationsForUser(vendorUser);
assert.equal(preview.unreadNotificationCount, 0);
assert.equal(preview.notifications.length, 0);

await createVendorNotification({
  vendorSlug: vendorUser.vendorSlug,
  type: "booking_request",
  title: "New booking request",
  message: "Ali requested a haircut for tomorrow.",
  bookingId: "bk-test-preview",
  clientName: "Ali",
  serviceName: "Haircut",
  appointmentDate: "2026-05-02",
  appointmentSlot: "2:30 PM"
});

preview = await listVendorNotificationsForUser(vendorUser);
assert.equal(preview.unreadNotificationCount, 1);
assert.equal(preview.notifications[0].type, "booking_request");
assert.equal(preview.notifications[0].clientName, "Ali");

const afterRead = await markAllVendorNotificationsRead(vendorUser);
assert.equal(afterRead.unreadNotificationCount, 0);
assert.equal(afterRead.notifications.every((item) => item.readAt), true);

store.vendorNotifications = [];

const service = store.services.find((item) => item.vendorSlug === vendorUser.vendorSlug);
assert.ok(service, "Expected a demo vendor service.");

const availability = await getStylistAvailability(vendorUser.vendorSlug, {
  serviceId: service.id,
  minLeadHours: 0
});
const targetWindow = availability.windows.find((window) => window.slots.length >= 1);

assert.ok(targetWindow, "Expected at least one available booking window.");

const booking = await createBooking({
  vendorSlug: vendorUser.vendorSlug,
  serviceId: service.id,
  serviceName: service.title,
  appointmentDate: targetWindow.date,
  appointmentSlot: targetWindow.slots.at(-1),
  customerId: clientUser.id,
  customerName: clientUser.name,
  customerEmail: clientUser.email,
  customerPhone: clientUser.phone,
  total: service.price
});

preview = await listVendorNotificationsForUser(vendorUser);
assert.equal(preview.unreadNotificationCount, 1);
assert.equal(preview.notifications[0].bookingId, booking.id);
assert.equal(preview.notifications[0].vendorSlug, vendorUser.vendorSlug);
assert.equal(preview.notifications[0].clientName, clientUser.name);

const conversation = store.conversations.find((item) => item.bookingId === booking.id);
assert.ok(conversation, "Expected a booking conversation to exist.");

await sendBookingMessage(clientUser, conversation.id, {
  body: "Please keep the finish soft and natural."
});

preview = await listVendorNotificationsForUser(vendorUser);
assert.equal(
  preview.notifications.some(
    (item) =>
      item.type === "booking_message" &&
      item.conversationId === conversation.id &&
      item.clientName === clientUser.name
  ),
  true
);

const dashboard = await getDashboardDataForUser(vendorUser);
assert.equal(Array.isArray(dashboard.notifications), true);
assert.equal(dashboard.unreadNotificationCount, preview.unreadNotificationCount);

console.log("vendor notification checks passed");
