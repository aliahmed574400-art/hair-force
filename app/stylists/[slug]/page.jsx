import Link from "next/link";
import { notFound } from "next/navigation";
import Reveal from "@/components/animated/Reveal";
import { getStylistBySlug } from "@/lib/postgres-repositories";
import { calculateDeposit, formatCurrency } from "@/lib/utils";

export default async function StylistProfilePage({ params }) {
  const stylist = await getStylistBySlug(params.slug);

  if (!stylist) {
    notFound();
  }

  return (
    <main className="section page-intro">
      <div className="container">
        <div className="profile-hero">
          <Reveal
            className="profile-banner"
            style={{
              background: stylist.coverImage
                ? `linear-gradient(135deg, rgba(7,18,38,.38), rgba(7,18,38,.62)), url(${stylist.coverImage}) center/cover`
                : stylist.coverGradient
            }}
          >
            <span className="badge badge-accent">{stylist.category}</span>
            <h1 style={{ margin: "16px 0 10px", fontFamily: "var(--font-display)", fontSize: "clamp(2.8rem, 6vw, 4.5rem)" }}>
              {stylist.name}
            </h1>
            <p style={{ maxWidth: 640, lineHeight: 1.8 }}>{stylist.tagline}</p>
            <div className="price-stack">
              <span className="badge">{stylist.city}</span>
              <span className="badge">{stylist.location}</span>
              <span className="badge">Rating {stylist.rating} ({stylist.reviewCount})</span>
              <span className="badge">{stylist.responseTime}</span>
            </div>
            <div className="hero-actions" style={{ marginTop: 24 }}>
              <Link href={`/book/${stylist.slug}`} className="button button-primary">
                Book appointment
              </Link>
              <Link href="/discover" className="button button-secondary">
                Browse more stylists
              </Link>
            </div>
          </Reveal>

          <Reveal className="surface sticky-card" style={{ padding: 28 }} delay={0.12}>
            <div className="eyebrow">Quick profile facts</div>
            <h3 style={{ margin: "12px 0 14px", fontFamily: "var(--font-display)", fontSize: "2rem" }}>
              Ready to book
            </h3>
            <div className="metrics-grid">
              <div className="metric-card">
                <strong>{formatCurrency(stylist.priceFrom)}</strong>
                <span className="muted tiny">starting price</span>
              </div>
              <div className="metric-card">
                <strong>{stylist.metrics.repeatClients}</strong>
                <span className="muted tiny">repeat clients</span>
              </div>
              <div className="metric-card">
                <strong>{stylist.metrics.showUpRate}</strong>
                <span className="muted tiny">show-up rate</span>
              </div>
            </div>
            <div className="chip-row" style={{ marginTop: 18 }}>
              {stylist.amenities.map((item) => (
                <span key={item} className="chip">
                  {item}
                </span>
              ))}
            </div>
            <Link href={`/book/${stylist.slug}`} className="button button-primary" style={{ marginTop: 22, width: "100%" }}>
              Continue to booking
            </Link>
          </Reveal>
        </div>

        <section className="section-tight">
          <div className="listing-grid">
            <Reveal className="surface" style={{ padding: 28 }}>
              <div className="section-heading" style={{ marginBottom: 18 }}>
                <span className="eyebrow">About this vendor</span>
                <h2>{stylist.heroTag}</h2>
                <p>{stylist.bio}</p>
              </div>
              <div className="chip-row">
                {stylist.specialties.map((item) => (
                  <span key={item} className="chip">
                    {item}
                  </span>
                ))}
              </div>
            </Reveal>

            <Reveal className="surface" style={{ padding: 28 }} delay={0.1}>
              <div className="eyebrow">Availability snapshot</div>
              <h3 style={{ margin: "12px 0 14px", fontFamily: "var(--font-display)", fontSize: "1.8rem" }}>
                Next open slots
              </h3>
              <div className="timeline">
                {stylist.bookingWindows.map((item) => (
                  <div key={item.date} className="timeline-item">
                    <strong>{item.label}</strong>
                    <div className="slot-grid">
                      {item.slots.map((slot) => (
                        <span key={slot} className="chip">
                          {slot}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        <section className="section-tight">
          <div className="section-heading">
            <span className="eyebrow">Services</span>
            <h2>Service menu with transparent pricing</h2>
          </div>
          <div className="service-list">
            {stylist.services.map((service) => (
              <Reveal key={service.id} className="service-item">
                <div className="service-meta">
                  <div>
                    <h4>{service.title}</h4>
                    <p className="muted" style={{ margin: "8px 0 0" }}>
                      {service.description}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <strong>{formatCurrency(service.price)}</strong>
                    <p className="muted tiny" style={{ margin: "8px 0 0" }}>
                      {service.duration}
                    </p>
                    <p className="muted tiny" style={{ margin: "4px 0 0" }}>
                      Deposit {formatCurrency(calculateDeposit(service, service.price))}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="section-tight">
          <div className="section-heading">
            <span className="eyebrow">Portfolio</span>
            <h2>Gallery-style social proof</h2>
          </div>
          <div className="three-grid">
            {stylist.gallery.map((item) => (
              <Reveal key={item.title} className="portrait-card">
                <div className="portrait" />
                <div className="card-body">
                  <h3 style={{ marginTop: 0, fontFamily: "var(--font-display)" }}>{item.title}</h3>
                  <p className="muted" style={{ marginBottom: 0 }}>
                    {item.caption}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="section-tight">
          <div className="section-heading">
            <span className="eyebrow">Reviews</span>
            <h2>Trust markers clients expect before booking</h2>
          </div>
          <div className="review-list">
            {stylist.reviews.map((review) => (
              <Reveal key={review.author} className="review-item">
                <div className="review-meta">
                  <h4>{review.author}</h4>
                  <span className="badge">Rating {review.rating}.0</span>
                </div>
                <p className="muted" style={{ marginBottom: 0 }}>
                  {review.text}
                </p>
              </Reveal>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
