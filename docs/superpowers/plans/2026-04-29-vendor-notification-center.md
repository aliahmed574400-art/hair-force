# Vendor Notification Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the vendor navbar bell redirect with a persisted notification popup that shows bookings, booking status changes, and new client messages, marks items read when opened, and opens booking/message detail in-place.

**Architecture:** Reuse the existing client notification architecture as the backend pattern, but add a vendor-scoped notification feed with its own repository helpers and event creation points. On the frontend, keep the popup logic in the navbar and fetch vendor notifications through the dashboard notifications API so the bell works independently of the page body while still opening vendor booking and conversation detail within the dashboard context.

**Tech Stack:** Next.js App Router, React client components, existing dashboard APIs, Postgres/demo-store repository layer, lucide-react, repo-local Node test files, ESLint

---

### Task 1: Add persisted vendor notifications to the repository layer

**Files:**
- Modify: `E:/My business/Projects/hairforce/lib/postgres-repositories.js`
- Modify: `E:/My business/Projects/hairforce/lib/demo-store.js`
- Modify: `E:/My business/Projects/hairforce/models/VendorProfile.js` (only if vendor notification persistence shape already lives there or needs compatibility metadata)
- Test: `E:/My business/Projects/hairforce/tests/vendor-notifications.test.js`

- [ ] **Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import {
  createDemoVendorNotification,
  buildDemoVendorNotificationsPreview
} from "../lib/postgres-repositories.js";

const preview = await buildDemoVendorNotificationsPreview("demo-barber");
assert.equal(preview.unreadNotificationCount, 0);

await createDemoVendorNotification({
  vendorSlug: "demo-barber",
  type: "booking_request",
  title: "New booking request",
  message: "A client requested Haircut at 2:30 PM.",
  bookingId: "bk-1",
  clientName: "Ali"
});

const nextPreview = await buildDemoVendorNotificationsPreview("demo-barber");
assert.equal(nextPreview.unreadNotificationCount, 1);
assert.equal(nextPreview.notifications[0].type, "booking_request");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-default-type=module tests/vendor-notifications.test.js`
Expected: FAIL with missing vendor notification helper(s)

- [ ] **Step 3: Write minimal implementation**

```js
function mapVendorNotificationRow(row) {
  return {
    id: row.id,
    vendorSlug: row.vendor_slug || row.vendorSlug || "",
    type: row.type || "info",
    title: row.title || "",
    message: row.message || "",
    readAt: row.read_at || row.readAt || null,
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    bookingId: row.booking_id || row.bookingId || "",
    conversationId: row.conversation_id || row.conversationId || "",
    clientName: row.client_name || row.clientName || "",
    clientAvatar: row.client_avatar || row.clientAvatar || "",
    serviceName: row.service_name || row.serviceName || "",
    appointmentDate: row.appointment_date || row.appointmentDate || "",
    appointmentSlot: row.appointment_slot || row.appointmentSlot || "",
    metadata: row.metadata || {}
  };
}

async function createVendorNotification(payload) {
  // mirror createClientNotification, but scoped by vendorSlug
}

async function listVendorNotificationsForUser(user) {
  // return newest-first list for the vendor's slug
}

async function markAllVendorNotificationsRead(user) {
  // mark unread vendor notifications read and return refreshed vendor preview payload
}
```

- [ ] **Step 4: Hook booking and message events into vendor notifications**

```js
await createVendorNotification({
  vendorSlug: booking.vendorSlug,
  type: "booking_request",
  title: "New booking request",
  message: `${booking.customerName} requested ${booking.serviceName} for ${booking.appointmentDate} at ${booking.appointmentSlot}.`,
  bookingId: booking.id,
  clientName: booking.customerName,
  serviceName: booking.serviceName,
  appointmentDate: booking.appointmentDate,
  appointmentSlot: booking.appointmentSlot,
  metadata: { bookingId: booking.id }
});
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --experimental-default-type=module tests/vendor-notifications.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add tests/vendor-notifications.test.js lib/postgres-repositories.js lib/demo-store.js models/VendorProfile.js
git commit -m "feat: add vendor notification persistence"
```

### Task 2: Expose vendor notifications through the dashboard API

**Files:**
- Modify: `E:/My business/Projects/hairforce/app/api/dashboard/notifications/route.js`
- Modify: `E:/My business/Projects/hairforce/app/api/dashboard/notifications/[id]/route.js`
- Modify: `E:/My business/Projects/hairforce/lib/postgres-repositories.js`
- Test: `E:/My business/Projects/hairforce/tests/vendor-notifications.test.js`

- [ ] **Step 1: Extend the failing test with read behavior**

```js
const unread = await listVendorNotificationsForUser({ role: "vendor", vendorSlug: "demo-barber" });
assert.equal(unread.notifications.some((item) => !item.readAt), true);

const afterRead = await markAllVendorNotificationsRead({ role: "vendor", vendorSlug: "demo-barber" });
assert.equal(afterRead.unreadNotificationCount, 0);
assert.equal(afterRead.notifications.every((item) => item.readAt), true);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-default-type=module tests/vendor-notifications.test.js`
Expected: FAIL because vendor read helpers / preview payload are incomplete

- [ ] **Step 3: Update the notifications API to branch by role**

```js
export async function GET(request) {
  const user = await getSessionFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const dashboard = await getDashboardDataForUser(user);
  return NextResponse.json({
    notifications: dashboard?.notifications || [],
    unreadNotificationCount: dashboard?.unreadNotificationCount || 0
  });
}

export async function PATCH(request) {
  const user = await getSessionFromRequest(request);
  const payload = await request.json();

  if (user.role === "vendor" && payload.action === "markAllRead") {
    const dashboard = await markAllVendorNotificationsRead(user);
    return NextResponse.json(dashboard);
  }

  // keep existing client behavior intact
}
```

- [ ] **Step 4: Keep single-notification read support symmetrical**

```js
if (user.role === "vendor") {
  const notification = await markVendorNotificationRead(user, params.id);
  return NextResponse.json({ notification });
}
```

- [ ] **Step 5: Run tests and lint**

Run: `node --experimental-default-type=module tests/vendor-notifications.test.js`
Expected: PASS

Run: `npm run lint`
Expected: PASS with existing repo warnings only

- [ ] **Step 6: Commit**

```bash
git add app/api/dashboard/notifications/route.js app/api/dashboard/notifications/[id]/route.js lib/postgres-repositories.js tests/vendor-notifications.test.js
git commit -m "feat: expose vendor notifications via dashboard api"
```

### Task 3: Replace the vendor bell redirect with a notifications popup

**Files:**
- Create: `E:/My business/Projects/hairforce/components/dashboard/VendorNotificationsPopover.jsx`
- Modify: `E:/My business/Projects/hairforce/components/ui/NavbarClient.jsx`
- Modify: `E:/My business/Projects/hairforce/app/globals.css`
- Test: manual browser verification on `/dashboard`

- [ ] **Step 1: Write the component shell**

```jsx
export default function VendorNotificationsPopover({
  notifications,
  unreadNotificationCount,
  isOpen,
  onOpenChange,
  onOpenBooking,
  onOpenConversation
}) {
  return (
    <div className={`vendor-notifications-popover ${isOpen ? "is-open" : ""}`}>
      <div className="vendor-notifications-popover-card">
        <header className="vendor-notifications-popover-head">
          <strong>Notifications</strong>
          <span>{unreadNotificationCount}</span>
        </header>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Replace the bell link in the navbar with a button**

```jsx
<button
  type="button"
  className="topbar-vendor-icon-link"
  aria-label="Open notifications"
  aria-expanded={isNotificationsOpen}
  onClick={toggleNotifications}
>
  <Bell size={18} />
  {unreadNotificationCount ? <span className="topbar-vendor-badge">{unreadNotificationCount}</span> : null}
</button>
```

- [ ] **Step 3: Fetch and mark notifications read on open**

```jsx
useEffect(() => {
  if (!isVendorDashboardView || !isNotificationsOpen) {
    return;
  }

  fetch("/api/dashboard/notifications", { cache: "no-store" }).then(/* hydrate list */);
  fetch("/api/dashboard/notifications", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "markAllRead" })
  }).then(/* sync unread count */);
}, [isNotificationsOpen, isVendorDashboardView]);
```

- [ ] **Step 4: Open booking/message detail in place**

```jsx
if (notification.conversationId) {
  const response = await fetch(`/api/dashboard/messages/${notification.conversationId}`);
  setNotificationModal({ kind: "conversation", payload: await response.json() });
  return;
}

if (notification.bookingId) {
  const booking = bookings.find((item) => String(item.id) === String(notification.bookingId));
  setNotificationModal({ kind: "booking", payload: booking || null });
}
```

- [ ] **Step 5: Style the popover**

```css
.vendor-notifications-popover-card {
  position: absolute;
  top: calc(100% + 14px);
  right: 0;
  width: min(420px, 92vw);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.98);
  border: 1px solid rgba(191, 219, 254, 0.88);
  box-shadow: 0 28px 60px rgba(15, 23, 42, 0.16);
}
```

- [ ] **Step 6: Verify manually**

Run:
- `npm run lint`
- open `/dashboard` as vendor
- click the bell

Expected:
- no redirect
- floating popup appears
- unread count updates on open
- clicking a notification opens booking or message detail in place

- [ ] **Step 7: Commit**

```bash
git add components/dashboard/VendorNotificationsPopover.jsx components/ui/NavbarClient.jsx app/globals.css
git commit -m "feat: add vendor notifications popup to navbar"
```

### Task 4: Final verification and cleanup

**Files:**
- Review only: `E:/My business/Projects/hairforce/components/ui/NavbarClient.jsx`
- Review only: `E:/My business/Projects/hairforce/components/dashboard/VendorNotificationsPopover.jsx`
- Review only: `E:/My business/Projects/hairforce/lib/postgres-repositories.js`
- Review only: `E:/My business/Projects/hairforce/app/api/dashboard/notifications/route.js`

- [ ] **Step 1: Run all targeted verification**

Run:
- `node --experimental-default-type=module tests/vendor-notifications.test.js`
- `node --experimental-default-type=module tests/availability-agenda.test.js`
- `npm run lint`

Expected:
- vendor notifications test PASS
- availability agenda regression PASS
- lint PASS with pre-existing warnings only

- [ ] **Step 2: Review spec coverage**

Check:
- bell opens popup, not redirect
- booking and message events appear
- popup-open marks notifications read
- click opens in-place detail

- [ ] **Step 3: Commit final polish if needed**

```bash
git add .
git commit -m "chore: finalize vendor notification center"
```
