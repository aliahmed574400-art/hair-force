import assert from "node:assert/strict";
import { compare } from "bcryptjs";
import { getDemoStore } from "../lib/demo-store.js";
import {
  addDashboardPaymentMethod,
  changeDashboardLoginEmail,
  changeDashboardPassword,
  getDashboardDataForUser,
  updateDashboardNotificationPreferences
} from "../lib/postgres-repositories.js";

const store = getDemoStore();
const vendorUser = store.users.find((user) => user.role === "vendor");

assert.ok(vendorUser, "Expected a demo vendor user.");

let dashboard = await getDashboardDataForUser(vendorUser);
assert.equal(dashboard.accountSecurity.authProvider, "email");
assert.equal(dashboard.accountSecurity.canChangeLoginEmail, true);
assert.equal(dashboard.accountSecurity.canChangePassword, true);
assert.equal(dashboard.billing.plan.name, "Premium Plan");
assert.equal(Array.isArray(dashboard.billing.paymentMethods), true);

const preferences = await updateDashboardNotificationPreferences(vendorUser, {
  bookingUpdates: false,
  clientMessages: true,
  reminders: false,
  marketingTexts: false,
  quietHoursEnabled: true,
  quietHoursFrom: "08:00",
  quietHoursTo: "18:00"
});

assert.equal(preferences.bookingUpdates, false);
assert.equal(preferences.clientMessages, true);
assert.equal(preferences.reminders, false);
assert.equal(preferences.marketingTexts, false);
assert.equal(preferences.quietHoursEnabled, true);
assert.equal(preferences.quietHoursFrom, "08:00");
assert.equal(preferences.quietHoursTo, "18:00");

dashboard = await getDashboardDataForUser(vendorUser);
assert.equal(dashboard.notificationPreferences.marketingTexts, false);
assert.equal(dashboard.notificationPreferences.quietHoursTo, "18:00");

dashboard = await addDashboardPaymentMethod(vendorUser, {
  holderName: "Vendor Demo",
  brand: "Visa",
  last4: "1234",
  expMonth: 12,
  expYear: 2032,
  isDefault: true
});

assert.equal(dashboard.billing.paymentMethods[0].last4, "1234");
assert.equal(dashboard.billing.paymentMethods[0].isDefault, true);

const nextEmail = `vendor-settings-${Date.now()}@hairforce.app`;
const changedUser = await changeDashboardLoginEmail(vendorUser, { email: nextEmail });
assert.equal(changedUser.email, nextEmail);
assert.equal(store.users.find((user) => user.id === vendorUser.id).email, nextEmail);

await assert.rejects(
  () =>
    changeDashboardPassword(changedUser, {
      currentPassword: "wrong-password",
      password: "newpass123",
      confirmPassword: "newpass123"
    }),
  /Current password is incorrect/
);

await changeDashboardPassword(changedUser, {
  currentPassword: "demo12345",
  password: "newpass123",
  confirmPassword: "newpass123"
});

assert.equal(
  await compare("newpass123", store.users.find((user) => user.id === vendorUser.id).passwordHash),
  true
);

const googleVendor = {
  ...store.users.find((user) => user.id === vendorUser.id),
  id: "usr-vendor-google-settings",
  email: "google-vendor-settings@hairforce.app",
  googleId: "google-settings",
  vendorSlug: "zoya-bridal-room",
  passwordHash: store.users.find((user) => user.id === vendorUser.id).passwordHash
};
store.users.push(googleVendor);

const googleDashboard = await getDashboardDataForUser(googleVendor);
assert.equal(googleDashboard.accountSecurity.authProvider, "google");
assert.equal(googleDashboard.accountSecurity.canChangeLoginEmail, false);
assert.equal(googleDashboard.accountSecurity.canChangePassword, false);

await assert.rejects(
  () => changeDashboardLoginEmail(googleVendor, { email: "blocked@hairforce.app" }),
  /email-based accounts/
);

await assert.rejects(
  () =>
    changeDashboardPassword(googleVendor, {
      currentPassword: "newpass123",
      password: "blocked123",
      confirmPassword: "blocked123"
    }),
  /email-based accounts/
);

console.log("vendor account settings checks passed");
