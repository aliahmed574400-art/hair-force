import Link from "next/link";
import Reveal from "@/components/animated/Reveal";
import CategoryCarousel from "@/components/home/CategoryCarousel";
import HeroBanner from "@/components/home/HeroBanner";
import PhoneFrame from "@/components/home/PhoneFrame";
import StickySearchBar from "@/components/home/StickySearchBar";
import {
  faqs,
  homeServiceCategories,
  howItWorks,
  platformFeatures,
  testimonials
} from "@/lib/data";
import { getFeaturedStylists } from "@/lib/postgres-repositories";
import { formatCurrency } from "@/lib/utils";

function HomeIcon({ name }) {
  switch (name) {
    case "scissors":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M8 6a2.75 2.75 0 1 1-5.5 0A2.75 2.75 0 0 1 8 6Zm0 12a2.75 2.75 0 1 1-5.5 0A2.75 2.75 0 0 1 8 18Zm2.5-6 10-7M10.5 12l10 7M7.9 7.6l3.1 3.1m-3.1 5.7 3.1-3.1"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
      );
    case "beard":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M8 7.5C8 5 9.9 3 12.2 3 14.7 3 16.5 5 16.5 7.6c1.5.4 2.5 1.8 2.5 3.5 0 1.6-.9 3-2.3 3.5-.5 3.5-2.7 5.4-4.9 5.4-2.2 0-4.5-1.9-5-5.4A3.7 3.7 0 0 1 4.5 11c0-1.7 1.1-3.2 2.7-3.5"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
      );
    case "style":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 3c3.8 0 6.8 2.8 6.8 6.4 0 3.7-3.2 7.5-6.8 11.6C8.4 16.9 5.2 13.1 5.2 9.4 5.2 5.8 8.2 3 12 3Z"
            fill="none"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
          <path
            d="M9.5 9.2c.7-.9 1.5-1.3 2.5-1.3 1.1 0 1.9.4 2.5 1.3"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.8"
          />
        </svg>
      );
    case "color":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 3 5 11.2A4.8 4.8 0 0 0 8.7 19h6.6a4.8 4.8 0 0 0 3.7-7.8L12 3Z"
            fill="none"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
          <path
            d="M9 15.2c1 .9 1.9 1.3 3 1.3 1.1 0 2-.4 3-1.3"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.8"
          />
        </svg>
      );
    case "facial":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 3c3.6 0 6.2 2.6 6.2 6.3v2.5c0 4.6-2.7 8.2-6.2 8.2s-6.2-3.6-6.2-8.2V9.3C5.8 5.6 8.4 3 12 3Z"
            fill="none"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
          <path
            d="M9.3 10.4v1.1M14.7 10.4v1.1M9.8 14.6c.7.6 1.4.9 2.2.9.8 0 1.5-.3 2.2-.9"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.8"
          />
        </svg>
      );
    case "search":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="m16 16 4.2 4.2" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        </svg>
      );
    case "service":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="5" width="16" height="14" rx="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M8 9h8M8 13h5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        </svg>
      );
    case "calendar":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3.5" y="5.5" width="17" height="15" rx="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M7.5 3.8v3.4M16.5 3.8v3.4M3.8 9.5h16.4"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.8"
          />
        </svg>
      );
    case "spark":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3ZM18.3 16.5l.7 2.1 2.1.7-2.1.7-.7 2.1-.7-2.1-2.1-.7 2.1-.7.7-2.1ZM5.7 15l.9 2.5 2.5.9-2.5.9-.9 2.5-.9-2.5-2.5-.9 2.5-.9.9-2.5Z"
            fill="none"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="1.4"
          />
        </svg>
      );
    case "schedule":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 7.8v4.7l3 1.9" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        </svg>
      );
    case "payments":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="6" width="18" height="12" rx="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M3.5 10h17M7 14.5h4.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        </svg>
      );
    case "notifications":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 4.5a4.2 4.2 0 0 1 4.2 4.2v2.1c0 1 .3 2.1.9 2.9l1 1.3H5.9l1-1.3c.6-.8.9-1.9.9-2.9V8.7A4.2 4.2 0 0 1 12 4.5Z"
            fill="none"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
          <path
            d="M10 18c.4 1.1 1 1.7 2 1.7s1.6-.6 2-1.7"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.8"
          />
        </svg>
      );
    case "reviews":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="m12 4.3 2.1 4.3 4.8.7-3.5 3.4.8 4.8L12 15.7l-4.2 2.2.8-4.8-3.5-3.4 4.8-.7L12 4.3Z"
            fill="none"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
      );
    case "dashboard":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M4.5 5.5h6v6h-6ZM13.5 5.5h6v4h-6ZM13.5 12.5h6v6h-6ZM4.5 14.5h6v4h-6Z"
            fill="none"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
      );
    case "network":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="6" cy="8" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="18" cy="8" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="12" cy="17" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M7.8 9.3 10.5 15M16.2 9.3 13.5 15M8.4 8h7.2"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.8"
          />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
  }
}

function SectionHeading({ eyebrow, title, description, center = false, id }) {
  return (
    <div id={id} className={`section-heading ${center ? "section-heading-center" : ""}`}>
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

function StarRating({ rating = 5 }) {
  return (
    <div className="rating-row" aria-label={`${rating} star rating`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <span key={index} className={`rating-star ${index < Math.round(rating) ? "is-active" : ""}`}>
          &#9733;
        </span>
      ))}
    </div>
  );
}

function StylistCard({ stylist, index }) {
  const specialty = stylist.specialties?.[0] || stylist.category;
  const initials = stylist.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Reveal className="featured-stylist-card" delay={index * 0.08}>
      <div className="featured-stylist-visual" style={{ backgroundImage: stylist.coverGradient }}>
        <div className="featured-stylist-glow" />
        <div className="featured-stylist-avatar">{initials}</div>
        <span className="featured-stylist-chip">{stylist.city}</span>
      </div>

      <div className="featured-stylist-body">
        <div className="featured-stylist-top">
          <div>
            <h3>{stylist.name}</h3>
            <p>{specialty}</p>
          </div>
          <span className="featured-stylist-rating">{stylist.rating}</span>
        </div>

        <StarRating rating={stylist.rating} />

        <div className="featured-stylist-meta">
          <span>{stylist.category}</span>
          <span>{formatCurrency(stylist.priceFrom)}</span>
        </div>

        <div className="hero-actions featured-stylist-actions">
          <Link href={`/stylists/${stylist.slug}`} className="button button-secondary">
            View profile
          </Link>
          <Link href={`/book/${stylist.slug}`} className="button button-primary">
            Book now
          </Link>
        </div>
      </div>
    </Reveal>
  );
}

function ProcessCard({ step, index }) {
  return (
    <Reveal className="process-card" delay={index * 0.08}>
      <div className="process-step">{step.step}</div>
      <div className="icon-bubble icon-bubble-sm">
        <HomeIcon name={step.icon} />
      </div>
      <h3>{step.title}</h3>
      <p>{step.text}</p>
    </Reveal>
  );
}

function PlatformFeatureCard({ feature, index }) {
  return (
    <Reveal className="platform-feature-card" delay={index * 0.05}>
      <div className="icon-bubble icon-bubble-sm">
        <HomeIcon name={feature.icon} />
      </div>
      <div>
        <h3>{feature.title}</h3>
        <p>{feature.text}</p>
      </div>
    </Reveal>
  );
}

function TestimonialCard({ testimonial }) {
  const initials = testimonial.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="testimonial-slide">
      <div className="testimonial-card home-testimonial-card">
        <div className="testimonial-header">
          <div className="testimonial-avatar">{initials}</div>
          <div>
            <strong>{testimonial.name}</strong>
            <span>{testimonial.role}</span>
          </div>
        </div>
        <StarRating rating={testimonial.rating} />
        <p>&ldquo;{testimonial.quote}&rdquo;</p>
      </div>
    </div>
  );
}

function HomeSectionShell({ children, className = "", panelClassName = "" }) {
  return (
    <div className={`home-section-shell ${className}`.trim()}>
      <div className={`home-section-panel ${panelClassName}`.trim()}>{children}</div>
    </div>
  );
}

export default async function HomeLanding() {
  const featuredStylists = await getFeaturedStylists();

  return (
    <main className="home-page">
      <section className="section page-intro home-hero-section">
        <div className="container">
          <Reveal className="hero-banner-reveal" y={26}>
            <HeroBanner />
          </Reveal>
        </div>
      </section>

      <StickySearchBar />

      <section className="section">
        <div className="container">
          <HomeSectionShell className="category-section-shell" panelClassName="category-section-panel">
            <SectionHeading
              eyebrow="Categories"
              title="Beauty services, organized for faster booking"
              description="Browse the most-booked service types in a polished glass grid designed to get clients from interest to appointment quickly."
              center
            />
            <CategoryCarousel categories={homeServiceCategories} />
          </HomeSectionShell>
        </div>
      </section>

      <section className="section" id="stylists">
        <div className="container">
          <HomeSectionShell>
            <SectionHeading
              eyebrow="Featured Stylists"
              title="Curated profiles with depth, trust, and clear pricing"
              description="Every listing surfaces rating, specialty, price point, and an immediate path to book, so the experience feels premium on every screen."
            />
            <div className="featured-stylist-grid">
              {featuredStylists.map((stylist, index) => (
                <StylistCard key={stylist.slug} stylist={stylist} index={index} />
              ))}
            </div>
          </HomeSectionShell>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <HomeSectionShell>
            <SectionHeading
              eyebrow="How It Works"
              title="A simple flow refined into a premium booking journey"
              description="Hair Force keeps discovery lightweight for clients while still giving stylists the trust signals and control they need to convert."
              center
            />
            <div className="process-grid">
              {howItWorks.map((step, index) => (
                <ProcessCard key={step.step} step={step} index={index} />
              ))}
            </div>
          </HomeSectionShell>
        </div>
      </section>

      <section className="section">
        <div className="container platform-grid">
          <HomeSectionShell className="home-section-shell-wide" panelClassName="home-section-panel-wide">
            <div className="platform-grid">
              <div>
                <SectionHeading
                  eyebrow="Platform Features"
                  title="A marketplace stack built for beauty businesses"
                  description="The platform brings together scheduling, payments, notifications, reviews, and vendor operations in one clean multi-vendor foundation."
                />
                <div className="platform-feature-grid">
                  {platformFeatures.map((feature, index) => (
                    <PlatformFeatureCard key={feature.title} feature={feature} index={index} />
                  ))}
                </div>
              </div>

              <Reveal className="platform-spotlight" delay={0.16}>
                <span className="eyebrow">Business intelligence</span>
                <h3>One workspace for discovery, conversion, and repeat bookings</h3>
                <div className="platform-spotlight-panel">
                  <div className="platform-spotlight-metric">
                    <strong>92%</strong>
                    <span>Profile strength</span>
                  </div>
                  <div className="platform-spotlight-metric">
                    <strong>31%</strong>
                    <span>Weekly rebook rate</span>
                  </div>
                  <div className="platform-spotlight-metric">
                    <strong>PKR 486k</strong>
                    <span>Revenue preview</span>
                  </div>
                </div>
                <div className="platform-spotlight-list">
                  <div className="platform-spotlight-item">
                    <span>Today</span>
                    <strong>8 bookings scheduled</strong>
                  </div>
                  <div className="platform-spotlight-item">
                    <span>Automation</span>
                    <strong>Smart reminders queued</strong>
                  </div>
                  <div className="platform-spotlight-item">
                    <span>Trust signal</span>
                    <strong>126 verified reviews visible</strong>
                  </div>
                </div>
              </Reveal>
            </div>
          </HomeSectionShell>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <HomeSectionShell>
            <SectionHeading
              eyebrow="App Preview"
              title="Booking flow, stylist profile, and vendor dashboard in one polished ecosystem"
              description="The homepage previews the full journey: clients browse on mobile, inspect profile details, and vendors manage their business from a premium dashboard."
              center
            />

            <div className="preview-showcase">
              <Reveal className="preview-side-card preview-side-card-left">
                <span className="preview-label">Booking flow</span>
                <h3>Choose, confirm, and secure a slot</h3>
                <div className="preview-stack">
                  <div className="preview-stack-item">
                    <span className="preview-stack-step">01</span>
                    <div>
                      <strong>Select service</strong>
                      <p>Pick haircut, styling, color, beard, or facial based on real service menus.</p>
                    </div>
                  </div>
                  <div className="preview-stack-item">
                    <span className="preview-stack-step">02</span>
                    <div>
                      <strong>Choose time</strong>
                      <p>Live slots update from recurring availability and blocked dates.</p>
                    </div>
                  </div>
                  <div className="preview-stack-item">
                    <span className="preview-stack-step">03</span>
                    <div>
                      <strong>Pay deposit</strong>
                      <p>Secure premium appointment time with a clean checkout experience.</p>
                    </div>
                  </div>
                </div>
              </Reveal>

              <Reveal className="preview-device-wrap" delay={0.12}>
                <PhoneFrame className="preview-phone">
                  <div className="preview-phone-screen">
                    <div className="preview-phone-header">
                      <span className="badge badge-accent">Hair Force</span>
                      <strong>Saturday booking</strong>
                    </div>
                    <div className="preview-phone-hero">
                      <span>Noor Atelier</span>
                      <h3>Signature Haircut + Blowout</h3>
                      <p>75 min - Deposit required - DHA Phase 6, Karachi</p>
                    </div>
                    <div className="preview-phone-slots">
                      {["11:00 AM", "1:30 PM", "4:00 PM"].map((slot) => (
                        <span key={slot} className="preview-slot-chip">
                          {slot}
                        </span>
                      ))}
                    </div>
                    <div className="preview-phone-summary">
                      <div>
                        <span>Total</span>
                        <strong>{formatCurrency(4500)}</strong>
                      </div>
                      <div>
                        <span>Deposit</span>
                        <strong>{formatCurrency(900)}</strong>
                      </div>
                    </div>
                    <button className="button button-primary device-button" type="button">
                      Continue to Checkout
                    </button>
                  </div>
                </PhoneFrame>
              </Reveal>

              <Reveal className="preview-side-card preview-side-card-right" delay={0.18}>
                <span className="preview-label">Stylist profile</span>
                <h3>Trust-heavy pages that help clients commit</h3>
                <div className="profile-preview-card">
                  <div className="profile-preview-banner" />
                  <div className="profile-preview-body">
                    <div className="row-between">
                      <strong>Noor Atelier</strong>
                      <span className="featured-stylist-rating">4.9</span>
                    </div>
                    <p>Luxury color, bridal prep, signature blowouts, and a calm premium studio experience.</p>
                    <div className="chip-row">
                      <span className="chip">Balayage</span>
                      <span className="chip">Bridal hair</span>
                      <span className="chip">Luxury blowouts</span>
                    </div>
                  </div>
                </div>
              </Reveal>

              <Reveal className="preview-dashboard-panel" delay={0.24}>
                <div className="preview-dashboard-head">
                  <div>
                    <span className="preview-label">Stylist dashboard</span>
                    <h3>Track bookings, service performance, and profile strength</h3>
                  </div>
                  <Link href="/dashboard" className="button button-secondary">
                    View dashboard
                  </Link>
                </div>

                <div className="preview-dashboard-metrics">
                  <div className="preview-dashboard-metric">
                    <strong>PKR 486k</strong>
                    <span>Monthly revenue</span>
                  </div>
                  <div className="preview-dashboard-metric">
                    <strong>18</strong>
                    <span>New bookings</span>
                  </div>
                  <div className="preview-dashboard-metric">
                    <strong>92%</strong>
                    <span>Profile strength</span>
                  </div>
                </div>

                <div className="preview-dashboard-list">
                  <div className="preview-dashboard-item">
                    <span>11:00 AM</span>
                    <strong>Sana Tahir - Signature Haircut + Blowout</strong>
                  </div>
                  <div className="preview-dashboard-item">
                    <span>1:30 PM</span>
                    <strong>Maryam Raza - Balayage Refresh</strong>
                  </div>
                  <div className="preview-dashboard-item">
                    <span>4:00 PM</span>
                    <strong>Areeba Hasan - Bridal Hair Trial</strong>
                  </div>
                </div>
              </Reveal>
            </div>
          </HomeSectionShell>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <HomeSectionShell>
            <SectionHeading
              eyebrow="Testimonials"
              title="What clients and stylists love about the experience"
              description="The visual system feels premium, but the real value is how clearly it connects discovery, trust, and booking for both sides of the marketplace."
            />
            <div className="testimonial-rail">
              {testimonials.map((testimonial) => (
                <TestimonialCard key={testimonial.name} testimonial={testimonial} />
              ))}
            </div>
          </HomeSectionShell>
        </div>
      </section>

      <section className="section" id="faqs">
        <div className="container">
          <HomeSectionShell>
            <SectionHeading
              eyebrow="FAQs"
              title="Answers for clients and growth-focused vendors"
              description="A few quick answers for the most common marketplace questions before launch."
              center
            />
            <div className="home-faq-grid">
              {faqs.map((item, index) => (
                <Reveal key={item.q} className="faq-card home-faq-card" delay={index * 0.06}>
                  <h3>{item.q}</h3>
                  <p>{item.a}</p>
                </Reveal>
              ))}
            </div>
          </HomeSectionShell>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <HomeSectionShell panelClassName="home-section-panel-cta">
            <Reveal className="cta-banner">
              <span className="eyebrow">Become a stylist</span>
              <h2>Grow Your Business with Hair Force</h2>
              <p>
                Create a premium profile, publish services, manage availability, and connect with more clients
                through a high-conversion beauty marketplace.
              </p>
              <div className="hero-actions">
                <Link href="/join" className="button button-primary">
                  Get Started
                </Link>
                <Link href="/discover" className="button button-secondary">
                  Browse Stylists
                </Link>
              </div>
            </Reveal>
          </HomeSectionShell>
        </div>
      </section>
    </main>
  );
}
