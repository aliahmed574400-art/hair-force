# Hair Force — Design Tokens

CSS variables live in `app/globals.css` under `:root`. This file is the brief; the CSS is the source of truth.

## Typography

**Family:** [General Sans](https://www.fontshare.com/fonts/general-sans) (Fontshare). Single family for body and display. Weight carries hierarchy — no second display font.

- `--font-body: "General Sans"` (everywhere)
- `--font-display: "General Sans"` (headings, large numerals)

**Weights used:**
- 400 — body copy, captions, microcopy
- 500 — buttons, emphasized text, smaller headings
- 400 (with negative letter-spacing) — large display headings (h1/h2)
- Heavier weights (600+) loaded but used sparingly

**Letter-spacing:**
- Display headings: `letter-spacing: -0.045em` to `-0.055em` (tight)
- Eyebrows / labels: `letter-spacing: 0.14em` to `0.18em` (loose, uppercase)
- Body: default

**Type scale (clamp-based, responsive):**
- Hero / page h1: `clamp(2.85rem, 5vw, 4.85rem)`
- Section h2: `clamp(2.4rem, 5vw, 4rem)`
- Card h3: `clamp(1.4rem, 2.2vw, 1.85rem)`
- Body: `clamp(1rem, 1.3vw, 1.08rem)`
- Microcopy / labels: `0.74rem` to `0.92rem`

## Color

**Brand**
- `--primary: #1e3a8a` — deep blue, primary CTAs, large brand surfaces
- `--accent: #3b82f6` — interactive accent, links, focus
- `--accent-strong: #2563eb` — pressed/active states
- `--accent-soft: #60a5fa` — hover halos, soft fills

**Text**
- `--text: #eff6ff` — on dark surfaces (rare; product is mostly light)
- `#18284b`, `#142345` — primary headlines on light backgrounds
- `rgba(39, 56, 94, 0.74)` — body copy on light backgrounds
- `--muted: #b9c9e8`, `rgba(39, 56, 94, 0.68)` — secondary copy

**Surfaces (light)**
- `#f1f5fe` — page gradient start
- `#ffffff` — page gradient end / card surface
- `rgba(255, 255, 255, 0.5–0.9)` — glass panels (always pair with `backdrop-filter: blur(18px)`)
- `rgba(132, 166, 229, 0.16–0.22)` — hairline borders on glass

**Surfaces (dark, used rarely)**
- `--bg: #040b18`
- `--panel: rgba(13, 22, 42, 0.74)`

**Status**
- `--success: #84f4d1`
- `--color-destructive: #dc2626`

**Never use** pure black (`#000`) or pure gray (`#888`) — they collapse the cool-blue palette.

## Radius

- `--radius-lg: 32px` — page-level panels, hero shells
- `--radius-md: 20px` — cards, modals, large buttons
- `--radius-sm: 14px` — inputs, small buttons, pills
- `999px` — fully rounded pills (used for tags, status chips, CTA pills)

## Elevation

Always layered shadows — never a single hard drop shadow. Pair an inset highlight with an outer shadow:

```css
box-shadow:
  inset 0 1px 0 rgba(255, 255, 255, 0.6),     /* highlight */
  0 18px 36px rgba(108, 136, 190, 0.10);      /* lift */
```

- `--shadow-md: 0 20px 50px rgba(2, 8, 23, 0.34)` — medium cards
- `--shadow-lg: 0 36px 120px rgba(2, 8, 23, 0.52)` — modals, hero panels

Shadow color is always cool blue tinted, not neutral gray.

## Glass

Many surfaces use light frosted glass:
```css
background: linear-gradient(180deg, rgba(255, 255, 255, 0.86), rgba(241, 245, 254, 0.78));
backdrop-filter: blur(18px);
border: 1px solid rgba(138, 164, 220, 0.16);
```
Avoid stacking three or more glass layers — readability collapses.

## Motion

**Library:** `framer-motion` is canonical. `gsap` is loaded but should not be added to new components — phase it out.

**Durations**
- Micro-interactions (hover, focus, button press): `150–200ms`
- Component transitions (modal open, card flip): `300–400ms`
- Page-level entrance (scroll-into-view reveals): `500–700ms`
- Springs: stiffness ~180, damping ~30 for "smooth, no bounce"; stiffness ~260, damping ~20 for "playful, slight overshoot"

**Easing**
- Standard: `[0.22, 1, 0.36, 1]` (custom cubic-bezier — "easeOutExpo-ish")
- Springs preferred for any cross-fade or layout change

**Rules**
- Motion conveys state, hierarchy, or causality. If it conveys none of those, cut it.
- Reduced motion: respect `prefers-reduced-motion`. The CSS in `globals.css` already disables several animations under that media query.
- No more new decorative-only motion (cursor companions, floating orbs, parallax background plates). The ones that exist will be pruned, not extended.

## Iconography

- `lucide-react` — exclusive icon library. No emojis in UI, no other icon packs.
- Stroke width: `1.8` (light) or `1.9` (medium) — never `2.5+`
- Icon size: `18px` in buttons, `24px` standalone, `26px` in feature panels

## Imagery

- Real stylist work over stock. Portrait orientation for portfolios, landscape for cover images.
- Cloudinary CDN for user-uploaded media. Unsplash/Pexels allowed for seed/demo data only — must be replaced before launch.
- AI-generated imagery (Pollinations) is acceptable inside the haircut try-on tool only — never in marketing or vendor profiles.

## Components — current vocabulary

The following components exist and should be reused before any new variant is built:

- `SiteButton` — primary action button
- `BookingForm` — used on stylist profile pages
- `Footer`, `Navbar`/`NavbarClient` — global layout
- `VendorDashboardManager` — vendor dashboard shell (split point: each section should become its own file when next touched)
- `ClientDashboard` — client dashboard shell
- `Reveal`, `RevealText`, `MagneticWrap`, `CountUp` — motion primitives, use these instead of writing one-off `motion.div`s

If a new design needs a third variant of something that already has two, fix the existing two first.

## Anti-patterns to avoid

- Floating decorative orbs / mesh gradients as section backgrounds — too AI-generated
- Two different display fonts on the same page
- Hard-coded color values in JSX — use the CSS variables in `globals.css`
- Cards smaller than `radius-md: 20px` — they read as toy buttons
- Section padding under `clamp(36px, 6vw, 80px)` — feels cramped on desktop
- Any motion under 100ms (looks like a glitch) or over 800ms (feels broken)
