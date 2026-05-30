# Hair Force — Product Brief

## What it is

A multi-vendor marketplace for booking hair stylists, barbers, colorists, makeup artists, and beauty professionals in the United States. Clients search by location and service, browse real portfolios, and book instantly with a deposit. Vendors run their service menu, calendar, bookings, and messaging through a self-service dashboard.

Built as a web app (Next.js); the dashboard, booking flow, and AI haircut try-on all live in the same product.

## Users

**Clients (~70% of attention)**
- Looking for a stylist in a specific neighborhood, often for a specific service (haircut, color, braids, blowout)
- Trust signals matter more than discovery breadth — they want to see real work before paying a deposit
- Mostly mobile or tablet
- Want to book and move on; no phone tag, no "we'll call you back"

**Vendors (~30% of attention)**
- Independent stylists or small salons — not chains
- Manage everything themselves: profile, services, prices, availability, photos
- Sensitive to anything that makes them look unprofessional next to competitors
- Use the dashboard daily, usually on a phone between clients
- Need fast confirmations on bookings and unambiguous payment status

**Admin (incidental)**
- Moderates new vendor applications, handles disputes
- Internal tooling, not a focus

## Brand voice

- **Modern, not corporate.** No "delight" copy, no exclamation marks, no "✨ Magic ✨"
- **Concrete, not abstract.** "5 salons in Williamsburg" beats "stylists near you"
- **Confident, not pleading.** "Book your slot" not "Tap here to try booking"
- **Honest about what's happening.** Show real prices, real deposit amounts, real cancellation windows — no surprise fees, no fake urgency

US English. American spellings, American date and currency formats, American addresses (street, city, state, ZIP).

## Anti-references

What we **don't** want to look or feel like:

- **StyleSeat** — cluttered, every pixel monetized, dated visuals
- **Booksy / Vagaro** — utilitarian and joyless; reads as scheduling software, not a place to discover stylists
- **Most barbershop websites** — generic stock photos, "Welcome to our salon" hero, contact form as the main CTA
- **Generic AI-generated landing pages** — gradient mesh backgrounds with floating orbs, every SaaS section pattern stacked top-to-bottom, animated cursor companions, decorative motion that doesn't earn its existence

If a section pattern is on a Cursor/Lovable/v0 demo, we have to justify why we're using it rather than defaulting to it.

## Strategic principles

1. **Editorial over generative.** Each section earns its place — better to ship 4 great sections than 12 mediocre ones. Cut before adding.
2. **Trust is the product.** Real portfolios, verified reviews, transparent pricing, deposit shown before booking. Trust signals beat conversion gimmicks.
3. **Speed of booking is the moat.** No phone calls, no "we'll get back to you," no fake availability. If a slot shows, it's bookable.
4. **Vendor dignity.** Treat the vendor side with the same craft as the client side. They are the supply; if they look amateurish, the marketplace looks amateurish.
5. **One market, one identity.** Currency, locale, address conventions, phone format must all agree. Mixed markets read as unfinished software.
6. **Motion serves comprehension, not decoration.** Animation conveys state and hierarchy. Decorative motion (drifting orbs, cursor pets, scroll-triggered confetti) is dead weight unless tied to a moment that needs emphasis.
7. **Mobile is the default canvas.** Desktop is the bigger version of the mobile design, not the other way around. If it doesn't work on a 380px-wide screen between clients, it doesn't ship.

## Out of scope (right now)

- Native iOS/Android apps — web only, mobile web is the priority
- International markets — US only
- Stylist-to-stylist features (community, mentorship) — single-sided marketplace for now
- Subscription tiers for vendors — flat take rate model
