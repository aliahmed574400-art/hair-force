import Link from "next/link";
import HeroStage from "@/components/animated/HeroStage";
import Reveal from "@/components/animated/Reveal";
import HomeLanding from "@/components/home/HomeLanding";
import SearchBar from "@/components/ui/SearchBar";
import {
  faqs,
  howItWorks,
  marketplaceHighlights,
  siteStats,
  testimonials,
  vendorBenefits
} from "@/lib/data";
import { getFeaturedStylists } from "@/lib/repositories";
import { formatCurrency } from "@/lib/utils";

function StylistCard({ stylist }) {
  return (
    <Reveal className="portrait-card">
      <div className="portrait" />
      <div className="card-body">
        <div className="card-title">
          <div>
            <h3>{stylist.name}</h3>
            <span className="muted tiny">
              {stylist.category} • {stylist.city}
            </span>
          </div>
          <span className="badge">{stylist.rating}</span>
        </div>
        <p className="muted tiny" style={{ marginTop: 0 }}>
          {stylist.tagline}
        </p>
        <div className="service-meta" style={{ marginTop: 14 }}>
          <span className="badge badge-accent">From {formatCurrency(stylist.priceFrom)}</span>
          <span className="muted tiny">{stylist.responseTime}</span>
        </div>
        <div className="hero-actions" style={{ marginTop: 16 }}>
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

export default async function HomePage() {
  return <HomeLanding />;
  const featuredStylists = await getFeaturedStylists();

  return (
    <main>
      <section className="section page-intro">
        <div className="container hero-grid">
          <Reveal className="hero-shell">
            <div className="hero-copy">
              <span className="eyebrow">Hair Force Marketplace</span>
              <div className="section-heading" style={{ marginBottom: 0 }}>
                <h1>Book the best stylists in your city</h1>
                <p>
                  A premium, multi-vendor marketplace for salons, beauty parlors, spas, barbers, nail studios, and independent artists. Styled in the Hair Force visual direction while keeping the discovery and booking flow that makes marketplace products convert.
                </p>
              </div>

              <SearchBar />

              <div className="hero-actions" style={{ marginTop: 22 }}>
                <Link href="/discover" className="button button-primary">
                  Find a stylist
                </Link>
                <Link href="/join" className="button button-secondary">
                  Join as stylist
                </Link>
              </div>

              <div className="hero-stats">
                {siteStats.map((stat) => (
                  <div key={stat.label} className="hero-stat">
                    <strong>{stat.value}</strong>
                    <span>{stat.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <HeroStage />
          </Reveal>
        </div>
      </section>

      <section className="section-tight">
        <div className="container">
          <Reveal className="three-grid">
            {marketplaceHighlights.map((item) => (
              <div key={item.title} className="feature-card">
                <div className="eyebrow">Inspired by marketplace UX</div>
                <h3 style={{ fontFamily: "var(--font-display)", margin: "14px 0 10px", fontSize: "1.6rem" }}>
                  {item.title}
                </h3>
                <p className="muted" style={{ margin: 0 }}>
                  {item.text}
                </p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-heading">
            <span className="eyebrow">Featured Stylists</span>
            <h2>Designed for the same high-intent booking behavior</h2>
            <p>
              StyleSeat works because discovery is fast, profiles are trust-heavy, and booking happens directly from the vendor page. Hair Force recreates that product logic with its own brand, layout, and market positioning.
            </p>
          </div>
          <div className="four-grid">
            {featuredStylists.map((stylist) => (
              <StylistCard key={stylist.slug} stylist={stylist} />
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-heading">
            <span className="eyebrow">How It Works</span>
            <h2>Simple user flow, expanded into a full product</h2>
          </div>
          <div className="three-grid">
            {howItWorks.map((item) => (
              <Reveal key={item.title} className="info-card">
                <span className="badge badge-accent">{item.step}</span>
                <h3 style={{ fontFamily: "var(--font-display)", margin: "18px 0 10px", fontSize: "1.5rem" }}>
                  {item.title}
                </h3>
                <p className="muted" style={{ margin: 0 }}>
                  {item.text}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container listing-grid">
          <Reveal className="surface" style={{ padding: 28 }}>
            <div className="section-heading" style={{ marginBottom: 18 }}>
              <span className="eyebrow">Why vendors join</span>
              <h2>Built for salons, spas, barbers, and beauty pros</h2>
              <p>
                The professional side mirrors the growth mechanics marketplace vendors expect: discoverability, booking control, social proof, and better rebooking.
              </p>
            </div>

            <div className="two-grid">
              {vendorBenefits.map((item) => (
                <div key={item.title} className="feature-card">
                  <h3 style={{ fontFamily: "var(--font-display)", margin: "0 0 10px", fontSize: "1.4rem" }}>
                    {item.title}
                  </h3>
                  <p className="muted" style={{ margin: 0 }}>
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal className="surface" style={{ padding: 28 }} delay={0.12}>
            <div className="eyebrow">Vendor preview</div>
            <h3 style={{ fontFamily: "var(--font-display)", margin: "12px 0 18px", fontSize: "2rem" }}>
              Your Hair Force profile becomes the storefront
            </h3>
            <div className="timeline">
              {[
                "Create your vendor profile and choose your category",
                "Publish services with durations, prices, and add-ons",
                "Set available booking windows and business rules",
                "Start collecting online bookings and repeat clients"
              ].map((item, index) => (
                <div key={item} className="timeline-item">
                  <span className="badge badge-accent">0{index + 1}</span>
                  <p style={{ margin: "12px 0 0" }}>{item}</p>
                </div>
              ))}
            </div>
            <Link href="/join" className="button button-primary" style={{ marginTop: 20 }}>
              Become a stylist
            </Link>
          </Reveal>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-heading">
            <span className="eyebrow">Social Proof</span>
            <h2>Trust-building sections ready for a marketplace launch</h2>
          </div>
          <div className="three-grid">
            {testimonials.map((item) => (
              <Reveal key={item.name} className="testimonial-card">
                <span className="badge">{item.role}</span>
                <p style={{ fontSize: "1.05rem", lineHeight: 1.8 }}>
                  “{item.quote}”
                </p>
                <strong>{item.name}</strong>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <Reveal className="hero-shell">
            <div className="section-heading" style={{ marginBottom: 18 }}>
              <span className="eyebrow">Become a stylist</span>
              <h2>Grow your business with Hair Force</h2>
              <p>
                Publish your brand, services, availability, and client experience in one polished profile. This MVP is ready to evolve into payments, reminders, and protected vendor accounts.
              </p>
            </div>
            <div className="hero-actions">
              <Link href="/join" className="button button-primary">
                Get started
              </Link>
              <Link href="/dashboard" className="button button-secondary">
                View dashboard
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-heading">
            <span className="eyebrow">FAQs</span>
            <h2>Common questions about the platform foundation</h2>
          </div>
          <div className="faq-grid">
            {faqs.map((item) => (
              <Reveal key={item.q} className="faq-card">
                <h3 style={{ fontFamily: "var(--font-display)", marginTop: 0, fontSize: "1.3rem" }}>{item.q}</h3>
                <p className="muted" style={{ marginBottom: 0 }}>
                  {item.a}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
