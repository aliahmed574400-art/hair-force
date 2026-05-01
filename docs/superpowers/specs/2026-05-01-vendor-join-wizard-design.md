# Vendor Join Wizard Design

## Summary

Replace the current one-screen vendor onboarding form on `/join` with a six-step, StyleSeat-inspired onboarding wizard for stylists and beauty vendors. Step 1 is mandatory and creates the vendor account immediately. Steps 2 through 6 are skippable, save progressively, and prefill the existing vendor dashboard so the vendor can finish setup later.

This work should also simplify the vendor dashboard IA:

- keep `Profile` as the main vendor-editing surface
- merge portfolio management into `Profile`
- remove the separate `Portfolio` section from the vendor dashboard navigation
- keep `Availability` as its own dashboard section, but prefill it from onboarding step 4

## Current State

### Join flow

- `/join` currently renders [app/join/page.jsx](/E:/My business/Projects/hairforce/app/join/page.jsx:1), which only mounts [components/ui/JoinForm.jsx](/E:/My business/Projects/hairforce/components/ui/JoinForm.jsx:1)
- the form is a single submit action posting to [app/api/vendors/route.js](/E:/My business/Projects/hairforce/app/api/vendors/route.js:1)
- successful submit creates the vendor user plus vendor profile and redirects to `/dashboard`

### Vendor data

- vendor creation lives in `createVendorAccount` inside [lib/postgres-repositories.js](/E:/My business/Projects/hairforce/lib/postgres-repositories.js:4423)
- vendor profile editing lives in `updateVendorProfile` inside [lib/postgres-repositories.js](/E:/My business/Projects/hairforce/lib/postgres-repositories.js:6241)
- vendor dashboard payload comes from `getDashboardDataForUser` in [lib/postgres-repositories.js](/E:/My business/Projects/hairforce/lib/postgres-repositories.js:4783)

### Vendor dashboard

- the current dashboard has separate `Profile`, `Portfolio`, and `Availability` sections in [components/dashboard/VendorDashboardManager.jsx](/E:/My business/Projects/hairforce/components/dashboard/VendorDashboardManager.jsx:1)
- profile already edits business info, avatar, cover image, specialties, policies, social links, and service location
- portfolio already supports image upload, reorder, and remove
- availability already supports timezone plus weekly rules in [components/dashboard/VendorAvailabilityAgenda.jsx](/E:/My business/Projects/hairforce/components/dashboard/VendorAvailabilityAgenda.jsx:1)

## Goals

1. Make `/join` feel like a premium, guided onboarding flow instead of a plain internal form.
2. Make step 1 required and non-skippable.
3. Let existing vendors choose `Log In` and go to `/vendor/signin`.
4. Let steps 2 to 6 be skippable.
5. Save onboarding data progressively so vendors can leave and resume without losing work.
6. Reuse the existing vendor data model whenever possible instead of inventing parallel onboarding-only storage.
7. Ensure onboarding data appears in the vendor dashboard profile and availability editors immediately.
8. Remove the separate dashboard `Portfolio` section and place its controls inside `Profile`.

## Non-Goals

- no full promo-code backend or billing engine in this phase
- no SMS delivery workflow in this phase beyond collecting preference data
- no full redesign of `/vendor/signin`
- no migration of the vendor dashboard into a six-step wizard; the dashboard remains an editor, not a guided onboarding sequence

## Product Decisions

### Sign-in path for existing vendors

Use `/vendor/signin`, not `/signin`.

Reason:

- the vendor route already exists at [app/vendor/signin/page.jsx](/E:/My business/Projects/hairforce/app/vendor/signin/page.jsx:1)
- it already uses vendor-specific audience copy and vendor/admin role restrictions in [components/ui/animated-characters-login-page.tsx](/E:/My business/Projects/hairforce/components/ui/animated-characters-login-page.tsx:217)

### Save strategy

Step 1 creates the vendor account immediately and signs the user in. Steps 2 through 6 update the vendor profile progressively.

Reason:

- image uploads require an authenticated user for [app/api/uploads/route.js](/E:/My business/Projects/hairforce/app/api/uploads/route.js:1)
- progressive save makes skip behavior reliable
- prefill into dashboard becomes natural because the vendor record already exists

### Skip behavior

- step 1: not skippable
- steps 2 through 6: skippable
- skip should still persist any data already entered in the current step before advancing when possible

## UX Design

## Visual Thesis

The onboarding should feel editorial, clean, and conversion-focused: a soft white left-side form canvas, oversized restrained typography, a calm dark-green accent system, and a full-height lifestyle image plane on the right. The UI should feel premium and deliberate, close to the provided StyleSeat references without cloning brand assets directly.

## Layout System

Each step uses the same macro layout:

- a thin branded header area
- split viewport with content on the left and image/stats panel on the right
- a fixed bottom action rail containing progress, back, skip when allowed, and next/submit CTA
- generous whitespace, minimal card usage, thin borders, quiet labels, and one accent color

Desktop:

- left content column roughly 55-60%
- right image panel roughly 40-45%

Mobile:

- form becomes single-column
- right-side image compresses into a shorter top or bottom media block
- bottom action rail remains easy to tap

## Step Structure

### Step 1: Account Creation

Required. Non-skippable.

Purpose:

- create stylist/vendor account
- sign the user in immediately
- create initial vendor profile record with defaults

Fields:

- first name
- last name
- email
- password with show/hide toggle
- phone number
- SMS opt-in toggle
- promotion code input
- validate button for promo code UI

Copy:

- include the "Already have an account? Log In" row
- `Log In` points to `/vendor/signin`

CTA:

- `Get Started`

Behavior:

- submit validates required fields
- if successful, create account and redirect into step 2 of the onboarding flow
- on duplicate email, show inline error and keep the user on step 1

### Step 2: Introduce Yourself

Skippable.

Purpose:

- capture essential public-facing identity details

Fields:

- profile picture upload
- business name

Behavior:

- derive owner name from first + last name from step 1 rather than asking again

### Step 3: Add Photos of Your Work

Skippable.

Purpose:

- populate `portfolioImages`

Fields / controls:

- four primary upload slots visible immediately
- allow adding more images later in dashboard profile

Behavior:

- uploaded images save to authenticated vendor profile
- onboarding should encourage at least 4 images but not hard-block the step

### Step 4: Availability

Skippable.

Purpose:

- collect working days, working hours, and timezone

Fields / controls:

- selectable days of week
- start time
- end time
- timezone
- `Customize Hours By Day` affordance

Behavior:

- map into vendor availability rules rather than an onboarding-only structure
- the result must prefill the existing dashboard availability editor

### Step 5: Specialty

Skippable.

Purpose:

- choose service specialties / category emphasis for discovery

Fields / controls:

- visual specialty tiles in the style of the reference
- multi-select behavior
- `Other` option included

Behavior:

- selected values save into vendor `specialties`
- one primary category should still exist for the existing vendor profile structure

### Step 6: Where Do You Work?

Skippable.

Purpose:

- capture service location type and address details

Fields / controls:

- location type cards: salon, home, mobile
- address line 1
- suite / apt / optional secondary line
- city / state / area inputs to match the current geocode flow

Behavior:

- save into `serviceLocationType` plus vendor location fields used by discovery map geocoding

## Route and Flow Design

### Primary route

Keep `/join` as the public stylist onboarding entry point.

### Step progression

Preferred URL shape:

- `/join?step=1`
- `/join?step=2`
- ...
- `/join?step=6`

Benefits:

- refresh-safe
- resumable
- easier back/forward behavior
- deep-linkable and refresh-safe

### Resume behavior

If a signed-in vendor visits `/join`, the flow should resume rather than creating a duplicate account.

Recommended rule:

- if signed-in user role is vendor/admin and vendor profile exists, render the wizard with current saved values
- default resume target should be the first incomplete or lightly-populated step
- minimal fallback is resuming at step 2 if account already exists and user is authenticated

### Completion behavior

After step 6 `Next` or skip, redirect to `/dashboard?section=profile` unless the final action came from availability-heavy changes that should intentionally land on `availability`. Default recommendation is `/dashboard?section=profile`.

## Data Model Mapping

The onboarding should reuse the existing vendor model as much as possible.

### Step 1 mapping

User record:

- `name` = `firstName + lastName`
- `email`
- `password`
- `phone`
- `role` = `vendor`

Vendor record defaults created immediately:

- `owner` = full name
- `name` = temporary business name until step 2 if not provided yet
- `status` = `pending`
- use the current default discovery/profile placeholders until later steps overwrite them

Additional storage needed for onboarding-only fields not yet in the vendor profile:

- SMS opt-in preference
- promo code value
- optional promo validation state

Recommendation:

- store these on the user record if they are account-level
- if adding schema now is too wide for this pass, store them as benign onboarding metadata on vendor profile JSON-compatible fields or defer persistence while keeping UI and validation behavior explicit in the implementation

### Step 2 mapping

- avatar -> `avatar`
- business name -> `name`

### Step 3 mapping

- work photos -> `portfolioImages`

### Step 4 mapping

- timezone -> user/dashboard timezone already supported by availability flow
- weekly schedule -> `availabilityRules`
- derived windows -> existing hydration/build logic can continue handling `bookingWindows`

### Step 5 mapping

- specialties -> `specialties`
- primary business category should map into `category`

Recommended behavior:

- the first chosen specialty or an explicit mapped specialty category becomes `category`
- the whole set becomes `specialties`

### Step 6 mapping

- location type -> `serviceLocationType`
- address inputs -> `location`, `state`, `city`, `area`
- optional secondary line may be composed into `location` if no dedicated field is added

## Backend Changes

## Vendor creation

[app/api/vendors/route.js](/E:/My business/Projects/hairforce/app/api/vendors/route.js:1) currently expects a single payload and creates the account/profile in one request. It should support the new step-1 payload.

Changes:

- accept first name + last name rather than single `name`
- accept phone
- accept SMS opt-in and promo code fields
- no longer require business name or city at account-creation time
- still create a valid vendor profile record with defaults

`createVendorAccount` in [lib/postgres-repositories.js](/E:/My business/Projects/hairforce/lib/postgres-repositories.js:4423) will need a lighter step-1 creation path.

## Progressive updates

Use [app/api/dashboard/profile/route.js](/E:/My business/Projects/hairforce/app/api/dashboard/profile/route.js:1) and [app/api/dashboard/availability/route.js](/E:/My business/Projects/hairforce/app/api/dashboard/availability/route.js:1) as the backbone for steps 2 through 6 whenever possible.

Recommendation:

- step 2 -> dashboard profile update
- step 3 -> upload API + dashboard profile update
- step 4 -> dashboard availability update
- step 5 -> dashboard profile update
- step 6 -> dashboard profile update

This avoids building a completely separate onboarding backend.

## Dashboard Changes

### Navigation

In [components/dashboard/VendorDashboardManager.jsx](/E:/My business/Projects/hairforce/components/dashboard/VendorDashboardManager.jsx:1):

- remove the `Portfolio` section from `SECTION_OPTIONS`
- keep `Profile`, `Services`, `Availability`, `Bookings`, `Messages`, `Settings`

### Profile section

Expand `Profile` so it contains:

- business identity fields
- owner and category data
- public profile text fields
- service location fields
- avatar and cover image upload
- specialties and amenities
- policies and social links
- portfolio manager UI currently found in the separate section

Portfolio inside profile should retain:

- image upload
- reorder
- remove
- save behavior

### Availability section

Keep the dedicated availability editor because it is richer than the onboarding step. It should simply start with the onboarding values already saved.

## Validation Rules

### Step 1

Required:

- first name
- last name
- email
- password
- phone

Optional:

- SMS opt-in
- promo code

Notes:

- promo validation may be UI-only in phase one unless a real backend is explicitly added
- step cannot advance without successful account creation

### Step 2

Business name should be strongly encouraged and likely required for `Next`, but `Skip` remains allowed.

Recommended rule:

- if the user clicks `Next`, require business name
- if the user clicks `Skip`, allow empty and preserve defaults

### Step 3

- allow skip
- accept zero uploads if skipped
- enforce image type validation through the existing upload pipeline

### Step 4

- allow skip
- when saving via `Next`, validate at least one selected day if the user interacted with the availability controls

### Step 5

- allow skip
- when saving via `Next`, require at least one specialty only if the user interacted and intends to continue with specialty data

### Step 6

- allow skip
- if the user chooses `Next` after interacting with location type/address, validate enough location detail for the geocode flow to remain useful

## Error Handling

- keep users on the current step after errors
- show inline human-readable errors near the form content, not only global toast-like messages
- do not discard previously entered fields on failed save
- duplicate email should resolve at step 1 with clear recovery copy and a visible link to `/vendor/signin`
- upload failures should leave current saved portfolio intact and allow retry
- location geocode failures should reuse the current explicit message pattern from vendor profile save where possible

## Testing Strategy

### UI

- render step 1 and verify it is non-skippable
- verify `Already have an account? Log In` points to `/vendor/signin`
- verify steps 2 through 6 show `Skip`
- verify step transitions preserve entered values
- verify a signed-in vendor can resume the flow

### API / repository

- creating a vendor account with the step-1 payload succeeds without business name/city
- duplicate email is rejected cleanly
- progressive profile updates from onboarding write into the same vendor data used by the dashboard
- availability onboarding updates correctly hydrate into dashboard availability state

### Dashboard integration

- the profile section shows onboarding-created avatar, business, location, specialties, and portfolio data
- the portfolio nav item no longer appears
- portfolio controls still work within profile

## Implementation Notes

- prefer extracting the join wizard into new focused onboarding components rather than growing `JoinForm.jsx`
- the current join page wrapper in [app/join/page.jsx](/E:/My business/Projects/hairforce/app/join/page.jsx:1) should stay thin
- the onboarding UI will need dedicated CSS/classes rather than overloading generic dashboard form grid styles
- right-side imagery should use project-local assets that ship with the app for the first implementation pass; exact asset sourcing is an implementation detail

## Assumptions Locked For Planning

- step 1 is mandatory
- steps 2 through 6 are skippable
- existing vendors use `/vendor/signin`
- onboarding data must prefill the dashboard
- dashboard `Portfolio` section is removed and merged into `Profile`
- portfolio upload remains a real persisted feature, not cosmetic placeholder content
- promo code support is phase-one lightweight unless explicitly expanded later
