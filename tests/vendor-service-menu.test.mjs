import assert from "node:assert/strict";
import { getDemoStore } from "../lib/demo-store.js";
import {
  createVendorService,
  getDashboardDataForUser,
  getStylistBySlug
} from "../lib/postgres-repositories.js";

const store = getDemoStore();
const vendorUser = store.users.find((user) => user.role === "vendor");

assert.ok(vendorUser, "Expected a demo vendor user.");

const categoryDashboard = await createVendorService(vendorUser, {
  serviceType: "category",
  title: "Protective Styles"
});
const category = categoryDashboard.services.find(
  (service) => service.serviceType === "category" && service.title === "Protective Styles"
);

assert.ok(category, "Expected category entries to be saved in the service menu.");
assert.equal(category.price, 0);
assert.equal(category.duration, "");

await createVendorService(vendorUser, {
  serviceType: "addon",
  title: "Steam hydration",
  price: 20,
  duration: "15 Minutes",
  description: "Add extra moisture after the base service.",
  metadata: {
    timeAdded: "after",
    limitedDays: true,
    requireDeposit: false
  }
});

await createVendorService(vendorUser, {
  serviceType: "service",
  title: "Starter Locs Test",
  price: 95,
  duration: "90 Minutes",
  parentCategoryId: category.id,
  metadata: {
    priceIsStartingAt: true
  }
});

await createVendorService(vendorUser, {
  serviceType: "combined",
  title: "Cut and Hydration Test",
  price: 125,
  duration: "120 Minutes",
  description: "A bundled appointment with a cut and hydration.",
  includedServiceIds: ["srv-demo-a", "srv-demo-b"]
});

const dashboard = await getDashboardDataForUser(vendorUser);
const addOn = dashboard.services.find((service) => service.title === "Steam hydration");
const groupedService = dashboard.services.find((service) => service.title === "Starter Locs Test");
const combinedService = dashboard.services.find((service) => service.title === "Cut and Hydration Test");

assert.equal(addOn.serviceType, "addon");
assert.equal(addOn.metadata.timeAdded, "after");
assert.equal(groupedService.parentCategoryId, category.id);
assert.equal(groupedService.metadata.priceIsStartingAt, true);
assert.equal(combinedService.serviceType, "combined");
assert.deepEqual(combinedService.includedServiceIds, ["srv-demo-a", "srv-demo-b"]);

const publicProfile = await getStylistBySlug(vendorUser.vendorSlug);

assert.ok(
  publicProfile.services.some((service) => service.title === "Cut and Hydration Test"),
  "Combined services should stay bookable on public profiles."
);
assert.equal(
  publicProfile.services.some((service) => service.title === "Steam hydration"),
  false,
  "Add-ons should not appear as standalone bookable services."
);
assert.equal(
  publicProfile.services.some((service) => service.title === "Protective Styles"),
  false,
  "Categories should not appear as standalone bookable services."
);
assert.equal(
  publicProfile.addons.some((service) => service.title === "Steam hydration"),
  true,
  "Public profiles should expose add-ons separately."
);
assert.equal(
  publicProfile.serviceCategories.some((service) => service.title === "Protective Styles"),
  true,
  "Public profiles should expose categories separately."
);

console.log("vendor service menu checks passed");
