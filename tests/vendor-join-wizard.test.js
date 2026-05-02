import assert from "node:assert/strict";
import { createVendorAccount } from "../lib/postgres-repositories.js";
import {
  SPECIALTY_OPTIONS,
  buildVendorAccountPayload,
  buildVendorAvailabilityPayload,
  buildVendorProfilePayload,
  inferVendorJoinStep
} from "../lib/vendor-join-wizard.js";

assert.equal(Array.isArray(SPECIALTY_OPTIONS), true);
assert.equal(SPECIALTY_OPTIONS.includes("Braids"), true);

const accountPayload = buildVendorAccountPayload({
  firstName: "Calvin",
  lastName: "Palmer",
  email: "calvin@example.com",
  password: "secret123",
  phone: "+1 555 111 2222",
  smsOptIn: true,
  promoCode: "STYLE21"
});

assert.deepEqual(accountPayload, {
  firstName: "Calvin",
  lastName: "Palmer",
  email: "calvin@example.com",
  password: "secret123",
  phone: "+1 555 111 2222",
  smsOptIn: true,
  promoCode: "STYLE21"
});

assert.deepEqual(
  buildVendorProfilePayload({
    businessName: "Calvin Cuts",
    profileImage: "/uploads/avatars/calvin.png"
  }),
  {
    name: "Calvin Cuts",
    avatar: "/uploads/avatars/calvin.png"
  }
);

assert.deepEqual(
  buildVendorProfilePayload({
    specialtySelections: ["Braids", "Locs", "Twists"]
  }),
  {
    category: "Braids",
    specialties: ["Braids", "Locs", "Twists"]
  }
);

assert.deepEqual(
  buildVendorProfilePayload({
    locationType: "mobile",
    addressLine1: "123 Main Street",
    addressLine2: "Suite 4",
    city: "Karachi",
    state: "Sindh",
    area: "Clifton"
  }),
  {
    serviceLocationType: "mobile",
    location: "123 Main Street, Suite 4",
    city: "Karachi",
    state: "Sindh",
    area: "Clifton"
  }
);

assert.deepEqual(
  buildVendorAvailabilityPayload({
    selectedDays: ["sun", "mon"],
    startTime: "09:00",
    endTime: "18:00",
    timezone: "Asia/Karachi"
  }),
  {
    availabilityRules: [
      { dayOfWeek: 0, startTime: "09:00", endTime: "18:00", slotMinutes: 120, active: true },
      { dayOfWeek: 1, startTime: "09:00", endTime: "18:00", slotMinutes: 120, active: true }
    ],
    timezone: "Asia/Karachi"
  }
);

assert.equal(inferVendorJoinStep({ user: null, vendor: null }), 1);

assert.equal(
  inferVendorJoinStep({
    user: { role: "vendor" },
    vendor: {
      name: "",
      avatar: "",
      portfolioImages: [],
      specialties: [],
      serviceLocationType: "",
      availabilityRules: []
    }
  }),
  2
);

assert.equal(
  inferVendorJoinStep({
    user: { role: "vendor" },
    vendor: {
      name: "Calvin Cuts",
      avatar: "/uploads/avatar.png",
      portfolioImages: ["/uploads/1.png", "/uploads/2.png", "/uploads/3.png", "/uploads/4.png"],
      specialties: ["Braids"],
      serviceLocationType: "mobile",
      availabilityRules: [
        {
          dayOfWeek: 1,
          startTime: "09:00",
          endTime: "18:00",
          slotMinutes: 120,
          active: true
        }
      ]
    }
  }),
  6
);

const created = await createVendorAccount({
  firstName: "Mira",
  lastName: "Cole",
  email: "mira.join@example.com",
  password: "secret123",
  phone: "+1 555 888 1010",
  smsOptIn: true,
  promoCode: "STYLE21"
});

assert.equal(created.user.role, "vendor");
assert.equal(created.user.name, "Mira Cole");
assert.equal(created.user.phone, "+1 555 888 1010");
assert.equal(created.vendor.owner, "Mira Cole");
assert.equal(created.vendor.status, "pending");
assert.equal(created.vendor.name, "Mira Cole Studio");
assert.equal(created.vendor.serviceLocationType, "");
assert.deepEqual(created.vendor.availabilityRules, []);
assert.equal(
  inferVendorJoinStep({
    user: created.user,
    vendor: created.vendor
  }),
  2
);

console.log("vendor join wizard helper checks passed");
