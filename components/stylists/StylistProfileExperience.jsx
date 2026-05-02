"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Reveal from "@/components/animated/Reveal";
import SiteButton from "@/components/ui/SiteButton";
import { buildVendorCityStateLabel } from "@/lib/discovery";
import { calculateDeposit, formatCurrency } from "@/lib/utils";

const LOCATION_LABELS = {
  studio: "Studio visit",
  home: "Home service",
  mobile: "Mobile service",
  both: "Studio + home service"
};

function buildBookingHref(slug, serviceId = "", date = "", slot = "") {
  const params = new URLSearchParams();

  if (serviceId) {
    params.set("service", serviceId);
  }

  if (date) {
    params.set("date", date);
  }

  if (slot) {
    params.set("slot", slot);
  }

  const query = params.toString();
  return `/book/${slug}${query ? `?${query}` : ""}`;
}

function serviceBookingLabel(service) {
  return service.bookingMethod === "approval" ? "Request to book" : "Instant booking";
}

function socialEntries(socialLinks = {}) {
  return Object.entries(socialLinks)
    .map(([key, value]) => ({
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      value: String(value || "").trim()
    }))
    .filter((item) => item.value);
}

export default function StylistProfileExperience({ stylist }) {
  const [selectedService, setSelectedService] = useState(null);
  const [availability, setAvailability] = useState({ loading: false, error: "", windows: [] });
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const services = stylist.services || [];
  const topServices = useMemo(() => {
    const featured = services.filter((service) => service.featured);
    return (featured.length ? featured : services).slice(0, 3);
  }, [services]);
  const portfolioImages = useMemo(() => {
    const merged = [
      ...(stylist.portfolioImages || []),
      ...(stylist.galleryImages || []),
      ...services.map((service) => service.imageUrl).filter(Boolean)
    ];
    return [...new Set(merged)].slice(0, 8);
  }, [services, stylist.galleryImages, stylist.portfolioImages]);
  const policies = stylist.policies || {};
  const socialLinks = socialEntries(stylist.socialLinks);

  useEffect(() => {
    if (!selectedService?.id) {
      return undefined;
    }

    let cancelled = false;

    async function loadAvailability() {
      setAvailability({ loading: true, error: "", windows: [] });

      try {
        const response = await fetch(
          `/api/stylists/${stylist.slug}/availability?serviceId=${selectedService.id}&maxWindows=8`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to load open times.");
        }

        if (cancelled) {
          return;
        }

        const firstWindow = data.windows?.[0] || null;
        setAvailability({ loading: false, error: "", windows: data.windows || [] });
        setSelectedDate(firstWindow?.date || "");
        setSelectedSlot(firstWindow?.slots?.[0] || "");
      } catch (error) {
        if (cancelled) {
          return;
        }

        setAvailability({ loading: false, error: error.message, windows: [] });
        setSelectedDate("");
        setSelectedSlot("");
      }
    }

    loadAvailability();

    return () => {
      cancelled = true;
    };
  }, [selectedService, stylist.slug]);

  const currentWindow =
    availability.windows.find((window) => window.date === selectedDate) || availability.windows[0] || null;

  return (
    <main className="section page-intro">
      <div className="container">
        <div className="profile-hero">
          <Reveal
            className="profile-banner stylist-profile-hero"
            style={{
              background: stylist.coverImage
                ? `linear-gradient(135deg, rgba(7,18,38,.35), rgba(7,18,38,.66)), url(${stylist.coverImage}) center/cover`
                : stylist.coverGradient
            }}
          >
            <div className="stylist-profile-hero-top">
              <div className="stylist-profile-avatar-wrap">
                {stylist.avatar ? (
                  <img src={stylist.avatar} alt={`${stylist.name} profile`} className="stylist-profile-avatar" />
                ) : (
                  <div className="stylist-profile-avatar stylist-profile-avatar-fallback">
                    {String(stylist.name || "HF")
                      .split(/\s+/)
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((item) => item.charAt(0).toUpperCase())
                      .join("")}
                  </div>
                )}
              </div>

              <div className="stylist-profile-hero-copy">
                <div className="chip-row">
                  <span className="badge badge-accent">{stylist.category}</span>
                  <span className="badge">{stylist.verified ? "Verified stylist" : "Marketplace stylist"}</span>
                  <span className="badge">{LOCATION_LABELS[stylist.serviceLocationType] || "Service available"}</span>
                </div>

                <h1
                  style={{
                    margin: "18px 0 10px",
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(2.8rem, 6vw, 4.8rem)"
                  }}
                >
                  {stylist.name}
                </h1>
                <p style={{ maxWidth: 760, lineHeight: 1.8 }}>{stylist.tagline}</p>
              </div>
            </div>

            <div className="price-stack">
              <span className="badge">{buildVendorCityStateLabel(stylist)}</span>
              <span className="badge">{stylist.location}</span>
              <span className="badge">Rating {stylist.rating} ({stylist.reviewCount})</span>
              <span className="badge">{stylist.responseTime}</span>
              <span className="badge">From {formatCurrency(stylist.priceFrom || 0)}</span>
            </div>

            <div className="hero-actions" style={{ marginTop: 24 }}>
              <SiteButton href={buildBookingHref(stylist.slug, topServices[0]?.id || "")}>Book appointment</SiteButton>
              <SiteButton
                type="button"
                variant="secondary"
                onClick={() => setSelectedService(topServices[0] || services[0] || null)}
              >
                See times
              </SiteButton>
            </div>
          </Reveal>

          <Reveal className="surface sticky-card stylist-profile-sidecard" style={{ padding: 28 }} delay={0.12}>
            <div className="eyebrow">Quick profile facts</div>
            <h3 style={{ margin: "12px 0 14px", fontFamily: "var(--font-display)", fontSize: "2rem" }}>
              Ready to book
            </h3>

            <div className="metrics-grid">
              <div className="metric-card">
                <strong>{formatCurrency(stylist.priceFrom || 0)}</strong>
                <span className="muted tiny">starting price</span>
              </div>
              <div className="metric-card">
                <strong>{stylist.metrics?.repeatClients || "0%"}</strong>
                <span className="muted tiny">repeat clients</span>
              </div>
              <div className="metric-card">
                <strong>{stylist.metrics?.showUpRate || "0%"}</strong>
                <span className="muted tiny">show-up rate</span>
              </div>
              <div className="metric-card">
                <strong>{services.length}</strong>
                <span className="muted tiny">live services</span>
              </div>
            </div>

            <div className="chip-row" style={{ marginTop: 18 }}>
              {(stylist.amenities || []).map((item) => (
                <span key={item} className="chip">
                  {item}
                </span>
              ))}
            </div>

            <div className="stylist-profile-help-card">
              <strong>Message access</strong>
              <p className="muted tiny">
                Booked clients can continue the conversation in their Hair Force dashboard. Stylists can message clients directly from their booking workspace.
              </p>
            </div>

            <SiteButton href={buildBookingHref(stylist.slug, topServices[0]?.id || "")} fullWidth style={{ marginTop: 22 }}>
              Continue to booking
            </SiteButton>
          </Reveal>
        </div>

        <section className="section-tight">
          <div className="listing-grid">
            <Reveal className="surface" style={{ padding: 28 }}>
              <div className="section-heading" style={{ marginBottom: 18 }}>
                <span className="eyebrow">About</span>
                <h2>{stylist.heroTag}</h2>
                <p>{stylist.bio}</p>
              </div>
              <div className="chip-row">
                {(stylist.specialties || []).map((item) => (
                  <span key={item} className="chip">
                    {item}
                  </span>
                ))}
              </div>
            </Reveal>

            <Reveal className="surface" style={{ padding: 28 }} delay={0.1}>
              <div className="eyebrow">Policies</div>
              <h3 style={{ margin: "12px 0 14px", fontFamily: "var(--font-display)", fontSize: "1.8rem" }}>
                What to expect before you book
              </h3>
              <div className="timeline">
                {[
                  ["Deposit policy", policies.deposit],
                  ["Cancellation policy", policies.cancellation],
                  ["Late arrival", policies.lateArrival],
                  ["Prep instructions", policies.prepInstructions]
                ]
                  .filter(([, value]) => value)
                  .map(([label, value]) => (
                    <div key={label} className="timeline-item">
                      <strong>{label}</strong>
                      <p className="muted tiny" style={{ margin: "8px 0 0" }}>
                        {value}
                      </p>
                    </div>
                  ))}
              </div>
            </Reveal>
          </div>
        </section>

        <section className="section-tight">
          <div className="section-heading">
            <span className="eyebrow">Top Services</span>
            <h2>High-intent services clients book first</h2>
          </div>
          <div className="three-grid">
            {topServices.map((service) => (
              <Reveal key={service.id} className="service-item stylist-top-service-card">
                {service.imageUrl ? (
                  <img src={service.imageUrl} alt={service.title} className="stylist-top-service-image" />
                ) : null}
                <div className="service-meta">
                  <div>
                    <h4>{service.title}</h4>
                    <p className="muted tiny" style={{ margin: "6px 0 0" }}>
                      {service.duration}
                    </p>
                  </div>
                  <strong>{formatCurrency(service.price)}</strong>
                </div>
                <p className="muted" style={{ marginBottom: 0 }}>
                  {service.description}
                </p>
                <div className="chip-row" style={{ marginTop: 14 }}>
                  <span className="chip">Deposit {formatCurrency(calculateDeposit(service, service.price))}</span>
                  <span className="chip">{serviceBookingLabel(service)}</span>
                </div>
                <div className="hero-actions" style={{ marginTop: 16 }}>
                  <SiteButton type="button" onClick={() => setSelectedService(service)}>
                    See times
                  </SiteButton>
                  <SiteButton href={buildBookingHref(stylist.slug, service.id)} variant="secondary">
                    Details
                  </SiteButton>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="section-tight">
          <div className="listing-grid">
            <Reveal className="surface" style={{ padding: 28 }}>
              <div className="eyebrow">Availability</div>
              <h3 style={{ margin: "12px 0 14px", fontFamily: "var(--font-display)", fontSize: "1.8rem" }}>
                Next open slots
              </h3>
              <div className="timeline">
                {(stylist.bookingWindows || []).length ? (
                  stylist.bookingWindows.map((item) => (
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
                  ))
                ) : (
                  <div className="timeline-item">
                    <p className="muted tiny" style={{ margin: 0 }}>
                      No public time slots are visible right now. Use the booking flow to check the latest availability for each service.
                    </p>
                  </div>
                )}
              </div>
            </Reveal>

            <Reveal className="surface" style={{ padding: 28 }} delay={0.12}>
              <div className="eyebrow">Links & contact</div>
              <h3 style={{ margin: "12px 0 14px", fontFamily: "var(--font-display)", fontSize: "1.8rem" }}>
                Profile details
              </h3>
              <div className="timeline">
                <div className="timeline-item">
                  <strong>Service location</strong>
                  <p className="muted tiny" style={{ margin: "8px 0 0" }}>
                    {LOCATION_LABELS[stylist.serviceLocationType] || stylist.serviceLocationType || "Studio visit"}
                  </p>
                </div>
                {socialLinks.length ? (
                  socialLinks.map((item) => (
                    <div key={item.key} className="timeline-item">
                      <strong>{item.label}</strong>
                      <Link href={item.value} className="muted tiny stylist-social-link" target="_blank">
                        {item.value}
                      </Link>
                    </div>
                  ))
                ) : (
                  <div className="timeline-item">
                    <strong>Message stylist</strong>
                    <p className="muted tiny" style={{ margin: "8px 0 0" }}>
                      After booking, both sides can continue in the Hair Force message inbox attached to the appointment.
                    </p>
                  </div>
                )}
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
            {services.map((service) => (
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
                <div className="chip-row" style={{ marginTop: 14 }}>
                  <span className="chip">{serviceBookingLabel(service)}</span>
                  {service.featured ? <span className="chip">Featured</span> : null}
                </div>
                <div className="hero-actions" style={{ marginTop: 16 }}>
                  <SiteButton type="button" onClick={() => setSelectedService(service)}>
                    See times
                  </SiteButton>
                  <SiteButton href={buildBookingHref(stylist.slug, service.id)} variant="secondary">
                    Continue booking
                  </SiteButton>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="section-tight">
          <div className="section-heading">
            <span className="eyebrow">Portfolio</span>
            <h2>Recent work and visual proof</h2>
          </div>
          <div className="stylist-portfolio-grid">
            {portfolioImages.length ? (
              portfolioImages.map((image, index) => (
                <Reveal key={`${image}-${index}`} className="stylist-portfolio-card">
                  <img src={image} alt={`${stylist.name} portfolio ${index + 1}`} className="stylist-portfolio-image" />
                </Reveal>
              ))
            ) : (
              <Reveal className="surface" style={{ padding: 28 }}>
                <p className="muted" style={{ margin: 0 }}>
                  Portfolio photos will appear here as the stylist adds real work samples from their dashboard.
                </p>
              </Reveal>
            )}
          </div>
        </section>

        <section className="section-tight">
          <div className="section-heading">
            <span className="eyebrow">Reviews</span>
            <h2>Trust markers clients expect before booking</h2>
          </div>
          <div className="review-list">
            {(stylist.reviews || []).length ? (
              stylist.reviews.map((review, index) => (
                <Reveal key={`${review.author}-${index}`} className="review-item">
                  <div className="review-meta">
                    <h4>{review.author}</h4>
                    <span className="badge">Rating {review.rating}.0</span>
                  </div>
                  <p className="muted" style={{ marginBottom: 0 }}>
                    {review.text}
                  </p>
                </Reveal>
              ))
            ) : (
              <Reveal className="review-item">
                <p className="muted" style={{ marginBottom: 0 }}>
                  Reviews will appear here after completed appointments are rated.
                </p>
              </Reveal>
            )}
          </div>
        </section>
      </div>

      {selectedService ? (
        <div className="stylist-times-modal-backdrop" onClick={() => setSelectedService(null)}>
          <div className="stylist-times-modal" onClick={(event) => event.stopPropagation()}>
            <div className="stylist-times-modal-head">
              <div>
                <div className="eyebrow">Your appointment with</div>
                <h3>{stylist.name}</h3>
                <p className="muted tiny">
                  {selectedService.title} · {formatCurrency(selectedService.price)} · {selectedService.duration}
                </p>
              </div>
              <button type="button" className="stylist-times-close" onClick={() => setSelectedService(null)}>
                Close
              </button>
            </div>

            <div className="stylist-times-alert">
              <strong>{serviceBookingLabel(selectedService)}</strong>
              <p className="muted tiny" style={{ margin: "6px 0 0" }}>
                {selectedService.bookingMethod === "approval"
                  ? "Choose a time and send the request. The stylist will confirm it from their dashboard."
                  : "Choose a time and continue to the full booking page to confirm details and payment."}
              </p>
            </div>

            {availability.loading ? (
              <div className="stylist-times-empty">Loading available times...</div>
            ) : availability.error ? (
              <div className="stylist-times-empty">{availability.error}</div>
            ) : availability.windows.length ? (
              <>
                <div className="stylist-times-date-row">
                  {availability.windows.map((window) => (
                    <button
                      key={window.date}
                      type="button"
                      className={`stylist-times-date-pill ${selectedDate === window.date ? "active" : ""}`}
                      onClick={() => {
                        setSelectedDate(window.date);
                        setSelectedSlot(window.slots[0] || "");
                      }}
                    >
                      {window.label}
                    </button>
                  ))}
                </div>

                <div className="slot-grid stylist-times-slot-grid">
                  {(currentWindow?.slots || []).map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      className={`stylist-times-slot ${selectedSlot === slot ? "active" : ""}`}
                      onClick={() => setSelectedSlot(slot)}
                    >
                      {slot}
                    </button>
                  ))}
                </div>

                <div className="stylist-times-footer">
                  <div>
                    <strong>{selectedService.title}</strong>
                    <p className="muted tiny" style={{ margin: "6px 0 0" }}>
                      {selectedDate && selectedSlot
                        ? `${currentWindow?.label || selectedDate} · ${selectedSlot}`
                        : "Choose a day and time to continue."}
                    </p>
                  </div>

                  <SiteButton
                    href={buildBookingHref(stylist.slug, selectedService.id, selectedDate, selectedSlot)}
                    className={!selectedDate || !selectedSlot ? "pointer-events-none opacity-60" : ""}
                  >
                    Continue booking
                  </SiteButton>
                </div>
              </>
            ) : (
              <div className="stylist-times-empty">
                No public slots are available for this service right now. Try another service or check back soon.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </main>
  );
}
