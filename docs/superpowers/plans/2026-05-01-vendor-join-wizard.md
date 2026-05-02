# Vendor Join Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a six-step vendor onboarding wizard on `/join` with required account creation in step 1, progressive save for steps 2-6, resume behavior for signed-in vendors, and dashboard profile prefilling with portfolio merged into the profile section.

**Architecture:** Keep vendor account creation on `/api/vendors`, but lighten it to allow step-1-only payloads and create a valid draft vendor profile immediately. Reuse the existing dashboard profile and availability APIs for progressive onboarding saves, and add a small onboarding helper module to centralize step inference, payload shaping, and step metadata so both the wizard and tests share one source of truth.

**Tech Stack:** Next.js App Router, React client components, existing Hairforce upload/session/dashboard APIs, PostgreSQL repository layer, Node `assert`-based tests.

---

### Task 1: Add onboarding helper tests first

**Files:**
- Create: `E:\My business\Projects\hairforce\tests\vendor-join-wizard.test.js`
- Create: `E:\My business\Projects\hairforce\lib\vendor-join-wizard.js`

- [ ] **Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import {
  SPECIALTY_OPTIONS,
  buildVendorAccountPayload,
  buildVendorProfilePayload,
  buildVendorAvailabilityPayload,
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
      availabilityRules: [{ dayOfWeek: 1, startTime: "09:00", endTime: "18:00", slotMinutes: 120, active: true }]
    }
  }),
  6
);

console.log("vendor join wizard helper checks passed");
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node tests/vendor-join-wizard.test.js
```

Expected: FAIL with module-not-found or missing-export errors for `lib/vendor-join-wizard.js`.

- [ ] **Step 3: Write minimal implementation**

Create `E:\My business\Projects\hairforce\lib\vendor-join-wizard.js` with:

```js
export const SPECIALTY_OPTIONS = [
  "Women's Cuts",
  "Men's Cuts (Stylist)",
  "Men's Cuts (Barber)",
  "Hair Color",
  "Highlights",
  "Natural Hair",
  "Braids",
  "Locs",
  "Wigs",
  "Weaves",
  "Twists",
  "Nails",
  "Waxing",
  "Eyebrows",
  "Skincare",
  "Lashes",
  "Makeup",
  "Kids",
  "Other"
];

const DAY_INDEX = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6
};

function cleanString(value) {
  return String(value || "").trim();
}

export function buildVendorAccountPayload(values) {
  return {
    firstName: cleanString(values.firstName),
    lastName: cleanString(values.lastName),
    email: cleanString(values.email),
    password: String(values.password || ""),
    phone: cleanString(values.phone),
    smsOptIn: Boolean(values.smsOptIn),
    promoCode: cleanString(values.promoCode)
  };
}

export function buildVendorProfilePayload(values) {
  if (Array.isArray(values.specialtySelections)) {
    const specialties = values.specialtySelections.map(cleanString).filter(Boolean);
    return {
      category: specialties[0] || "",
      specialties
    };
  }

  if ("locationType" in values) {
    return {
      serviceLocationType: cleanString(values.locationType),
      location: [cleanString(values.addressLine1), cleanString(values.addressLine2)].filter(Boolean).join(", "),
      city: cleanString(values.city),
      state: cleanString(values.state),
      area: cleanString(values.area)
    };
  }

  return {
    name: cleanString(values.businessName),
    avatar: cleanString(values.profileImage)
  };
}

export function buildVendorAvailabilityPayload(values) {
  return {
    availabilityRules: (values.selectedDays || [])
      .map((day) => DAY_INDEX[String(day || "").toLowerCase()])
      .filter((dayOfWeek) => dayOfWeek !== undefined)
      .map((dayOfWeek) => ({
        dayOfWeek,
        startTime: cleanString(values.startTime) || "09:00",
        endTime: cleanString(values.endTime) || "18:00",
        slotMinutes: 120,
        active: true
      })),
    timezone: cleanString(values.timezone)
  };
}

export function inferVendorJoinStep({ user, vendor }) {
  if (user?.role !== "vendor") {
    return 1;
  }

  const hasProfileIntro = Boolean(cleanString(vendor?.name) && cleanString(vendor?.avatar));
  const portfolioCount = Array.isArray(vendor?.portfolioImages) ? vendor.portfolioImages.filter(Boolean).length : 0;
  const specialtyCount = Array.isArray(vendor?.specialties) ? vendor.specialties.filter(Boolean).length : 0;
  const hasLocationType = Boolean(cleanString(vendor?.serviceLocationType));
  const hasAvailability = Array.isArray(vendor?.availabilityRules) && vendor.availabilityRules.some((item) => item?.active !== false);

  if (!hasProfileIntro) return 2;
  if (portfolioCount < 4) return 3;
  if (!hasAvailability) return 4;
  if (!specialtyCount) return 5;
  if (!hasLocationType) return 6;
  return 6;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
node tests/vendor-join-wizard.test.js
```

Expected: PASS with `vendor join wizard helper checks passed`.

- [ ] **Step 5: Commit**

```bash
git add tests/vendor-join-wizard.test.js lib/vendor-join-wizard.js
git commit -m "test: add vendor join wizard helper coverage"
```

### Task 2: Add failing repository coverage for account-first vendor creation

**Files:**
- Modify: `E:\My business\Projects\hairforce\tests\vendor-join-wizard.test.js`
- Modify: `E:\My business\Projects\hairforce\lib\postgres-repositories.js`
- Modify: `E:\My business\Projects\hairforce\app\api\vendors\route.js`
- Modify: `E:\My business\Projects\hairforce\lib\postgres.js`
- Modify: `E:\My business\Projects\hairforce\lib\demo-store.js`

- [ ] **Step 1: Extend the failing test**

Append to `tests/vendor-join-wizard.test.js`:

```js
import { createVendorAccount } from "../lib/postgres-repositories.js";

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
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node tests/vendor-join-wizard.test.js
```

Expected: FAIL because `createVendorAccount` still requires `businessName` and `city`, or returns the wrong vendor defaults.

- [ ] **Step 3: Write minimal implementation**

Apply these changes:

- in `app/api/vendors/route.js`, validate `firstName`, `lastName`, `email`, `password`, and `phone` instead of `name`, `businessName`, and `city`
- in `lib/postgres-repositories.js`, update `createVendorAccount(payload)` so:
  - full name comes from `firstName + lastName`
  - `businessName` defaults to `${fullName} Studio`
  - city/location become optional
  - `serviceLocationType` starts as `""`
  - step-1 extra fields are accepted without breaking creation
- in `lib/postgres.js`, add schema statements for onboarding account metadata only if used by the implementation
- in `lib/demo-store.js`, preserve compatible defaults for draft vendor creation

Key repository target behavior:

```js
const fullName = `${String(payload.firstName || "").trim()} ${String(payload.lastName || "").trim()}`.trim();
const businessName = String(payload.businessName || `${fullName} Studio`).trim();
const fallbackLocation = String(payload.location || payload.city || "").trim();
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
node tests/vendor-join-wizard.test.js
```

Expected: PASS with both helper and vendor account creation assertions succeeding.

- [ ] **Step 5: Commit**

```bash
git add tests/vendor-join-wizard.test.js app/api/vendors/route.js lib/postgres-repositories.js lib/postgres.js lib/demo-store.js
git commit -m "feat: support account-first vendor onboarding"
```

### Task 3: Build the six-step join wizard

**Files:**
- Create: `E:\My business\Projects\hairforce\components\ui\VendorJoinWizard.jsx`
- Modify: `E:\My business\Projects\hairforce\app\join\page.jsx`
- Modify: `E:\My business\Projects\hairforce\app\globals.css`
- Modify: `E:\My business\Projects\hairforce\components\ui\JoinForm.jsx`

- [ ] **Step 1: Write the failing test**

Add a minimal render-free contract test to `tests/vendor-join-wizard.test.js`:

```js
assert.equal(inferVendorJoinStep({ user: null, vendor: null }), 1);
```

- [ ] **Step 2: Run test to verify it fails if the contract does not hold**

Run:

```bash
node tests/vendor-join-wizard.test.js
```

Expected: PASS if helper already returns `1`; otherwise FAIL and fix helper before UI work.

- [ ] **Step 3: Write minimal implementation**

Implement a new `VendorJoinWizard` component with:

- step query parameter support via `useSearchParams` / `useRouter`
- step 1 mandatory account form
- steps 2-6 skippable
- `/vendor/signin` link in step 1
- right-side image panel and bottom fixed action rail
- progressive save:
  - step 1 -> `POST /api/vendors`
  - step 2 -> `PUT /api/dashboard/profile`
  - step 3 -> upload to `/api/uploads`, then `PUT /api/dashboard/profile`
  - step 4 -> `PUT /api/dashboard/availability`
  - step 5 -> `PUT /api/dashboard/profile`
  - step 6 -> `PUT /api/dashboard/profile`
- signed-in vendor resume using `initialUser`, `initialDashboard`, and `inferVendorJoinStep`

Update `app/join/page.jsx` so it:

- reads the current session with `getSessionFromServer()`
- loads dashboard data for vendor users with `getDashboardDataForUser()`
- renders `VendorJoinWizard` instead of the old simple form

Leave `JoinForm.jsx` as a thin compatibility wrapper that renders `VendorJoinWizard`, or retire its contents and repoint imports if only `/join` uses it.

- [ ] **Step 4: Run focused verification**

Run:

```bash
npm run dev
```

Manual checks:

- `/join?step=1` shows the required account step
- step 1 has no `Skip`
- the `Log In` link points to `/vendor/signin`
- after successful step 1, the user advances to step 2
- steps 2-6 show `Skip`

- [ ] **Step 5: Commit**

```bash
git add app/join/page.jsx components/ui/VendorJoinWizard.jsx components/ui/JoinForm.jsx app/globals.css
git commit -m "feat: add vendor onboarding wizard"
```

### Task 4: Prefill dashboard profile and merge portfolio into Profile

**Files:**
- Modify: `E:\My business\Projects\hairforce\components\dashboard\VendorDashboardManager.jsx`

- [ ] **Step 1: Write the failing test**

Extend `tests/vendor-join-wizard.test.js` with a profile-shape contract:

```js
assert.deepEqual(
  buildVendorProfilePayload({
    locationType: "salon",
    addressLine1: "1500 Union Street",
    addressLine2: "Suite 7",
    city: "San Francisco",
    state: "California",
    area: "Marina"
  }),
  {
    serviceLocationType: "salon",
    location: "1500 Union Street, Suite 7",
    city: "San Francisco",
    state: "California",
    area: "Marina"
  }
);
```

- [ ] **Step 2: Run test to verify it fails if the profile shape regresses**

Run:

```bash
node tests/vendor-join-wizard.test.js
```

Expected: PASS after helper stabilization; otherwise FAIL before dashboard edits.

- [ ] **Step 3: Write minimal implementation**

Update `VendorDashboardManager.jsx` so:

- remove the `Portfolio` entry from `SECTION_OPTIONS`
- remove the `activeSection === "portfolio"` panel entirely
- place the current portfolio upload/grid/reorder/remove controls inside the `Profile` panel below the main profile fields
- add an account details cluster near the top of profile showing:
  - owner/user name
  - email
  - phone
- ensure onboarding-created business name, avatar, specialties, location, and portfolio data render from saved state

- [ ] **Step 4: Run focused verification**

Run:

```bash
npm run dev
```

Manual checks:

- `/dashboard?section=profile` shows portfolio controls inside profile
- the sidebar/nav no longer shows `Portfolio`
- uploading/removing/reordering still works
- onboarding-saved data appears in profile and availability

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/VendorDashboardManager.jsx
git commit -m "feat: merge vendor portfolio into profile"
```

### Task 5: Final verification

**Files:**
- Verify only

- [ ] **Step 1: Run all targeted tests**

Run:

```bash
node tests/availability-agenda.test.js
node tests/google-auth-ownership.test.js
node tests/vendor-notifications.test.js
node tests/vendor-join-wizard.test.js
```

Expected: PASS for all four test files.

- [ ] **Step 2: Run the app and verify key routes**

Run:

```bash
cmd /c codex-start-dev.cmd
```

Verify:

- `http://127.0.0.1:3000/join?step=1`
- `http://127.0.0.1:3000/vendor/signin`
- `http://127.0.0.1:3000/dashboard?section=profile`
- `http://127.0.0.1:3000/dashboard?section=availability`

- [ ] **Step 3: Commit**

```bash
git status --short
```

Expected: no unexpected onboarding-only regressions left unresolved before the final branch decision.
