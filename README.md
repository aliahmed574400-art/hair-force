# Hair Force

Hair Force is a StyleSeat-inspired multi-vendor beauty marketplace built with Next.js, React, Framer Motion, GSAP, and a PostgreSQL-ready data layer for marketplace-grade bookings and vendor operations.

## Included in this MVP

- Premium neon landing page based on the provided Hair Force visual direction
- Marketplace search and discovery flow for salons, barbers, spas, makeup artists, nail studios, and braid specialists
- Detailed stylist profile pages with services, reviews, gallery, amenities, and availability
- Booking flow with service selection, time-slot selection, and booking API
- Stylist sign-in and vendor dashboard
- Client sign-up and sign-in screens with session cookie auth
- Session-aware client and vendor dashboards
- Vendor profile editing, cover image upload, service CRUD, recurring availability rules, and blackout date editing
- Admin moderation queue for approving or rejecting vendor listings
- Deposit-ready booking flow with Stripe Elements support and a Stripe-capable checkout fallback
- Local image upload API that stores assets in `public/uploads`, with optional Cloudinary delivery
- PostgreSQL-backed repositories for users, vendor profiles, services, and bookings
- Demo fallback data when `DATABASE_URL` is not configured

## Tech stack

- Next.js App Router
- React
- Framer Motion
- GSAP
- PostgreSQL
- bcryptjs
- Stripe Node SDK
- Stripe Elements
- Cloudinary (optional)

## Getting started

1. Install dependencies:

```bash
npm install
```

2. Run the app:

```bash
npm run dev
```

3. Optional: connect PostgreSQL, payments, and cloud media by copying `.env.example` to `.env.local` and setting:

- `DATABASE_URL`
- `SESSION_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` and `STRIPE_SECRET_KEY` if you want Stripe Elements and real PaymentIntent creation
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` if you want uploads stored in Cloudinary instead of `public/uploads`

## Main routes

- `/` home page
- `/discover` stylist discovery
- `/stylists/[slug]` stylist profile
- `/book/[slug]` booking flow
- `/dashboard` session-aware client or vendor dashboard
- `/admin` admin moderation queue
- `/signin` client sign-in
- `/vendor/signin` stylist sign-in
- `/signup` client sign-up

## API routes

- `GET /api/stylists`
- `GET /api/stylists/[slug]`
- `POST /api/bookings`
- `POST /api/auth/signup`
- `POST /api/auth/signin`
- `GET /api/auth/me`
- `POST /api/auth/signout`
- `GET/PUT /api/dashboard/profile`
- `PUT /api/dashboard/availability`
- `GET/POST /api/dashboard/services`
- `PUT/DELETE /api/dashboard/services/[id]`
- `GET /api/dashboard/bookings`
- `POST /api/uploads`
- `GET /api/admin/vendors`
- `PUT /api/admin/vendors/[slug]`
- `POST /api/payments/checkout`

## Booking and vendor behavior

- Public discovery only shows vendors that have been approved by an admin
- New vendors start in `pending` status until approved from `/admin`
- Vendor availability is driven by recurring weekly rules plus optional blackout dates
- If Stripe keys are missing, the booking flow falls back to a mock deposit flow for local development
- If `DATABASE_URL` is present, the app auto-creates the PostgreSQL schema and seeds the initial demo marketplace data on first boot
- If Cloudinary keys are missing, uploads are stored locally in `public/uploads`

## Demo accounts

- Client: `client@hairforce.app` / `demo12345`
- Vendor: `vendor@hairforce.app` / `demo12345`
- Admin: `admin@hairforce.app` / `demo12345`

## Next recommended upgrades

- Replace the custom session layer with Auth.js if you want OAuth, magic links, or provider logins
- Add Google Calendar or Outlook sync for vendor appointment management
- Add reminders, cancellation rules, and deeper rebooking flows
- Add multi-admin moderation notes and audit history
- Add payouts, commissions, and a real vendor earnings ledger
