import { notFound } from "next/navigation";
import BookingForm from "@/components/ui/BookingForm";
import { getStylistBySlug } from "@/lib/postgres-repositories";
import { calculateDeposit, formatCurrency } from "@/lib/utils";

export default async function BookingPage({ params }) {
  const stylist = await getStylistBySlug(params.slug);

  if (!stylist) {
    notFound();
  }

  return (
    <main className="section page-intro">
      <div className="container listing-grid">
        <section>
          <div className="section-heading">
            <span className="eyebrow">Booking flow</span>
            <h1 style={{ fontSize: "clamp(2.6rem, 6vw, 4.5rem)" }}>Book {stylist.name}</h1>
            <p>
              This page mirrors the most important marketplace conversion moment: select a service, choose a slot, and reserve directly from the vendor profile.
            </p>
          </div>

          <div className="surface" style={{ padding: 28 }}>
            <div className="row-between">
              <div>
                <h3 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: "2rem" }}>{stylist.heroTag}</h3>
                <p className="muted" style={{ marginBottom: 0 }}>
                  {stylist.city} - {stylist.location}
                </p>
              </div>
              <span className="badge badge-accent">{stylist.rating} rating</span>
            </div>
            <div className="chip-row" style={{ marginTop: 18 }}>
              {stylist.specialties.map((item) => (
                <span key={item} className="chip">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="surface" style={{ padding: 28, marginTop: 18 }}>
            <div className="eyebrow">What clients see before they book</div>
            <div className="timeline" style={{ marginTop: 16 }}>
              {stylist.services.map((service) => (
                <div key={service.id} className="timeline-item">
                  <div className="service-meta">
                    <div>
                      <strong>{service.title}</strong>
                      <p className="muted tiny" style={{ margin: "8px 0 0" }}>
                        {service.duration}
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <strong>{formatCurrency(service.price)}</strong>
                      <p className="muted tiny" style={{ margin: "8px 0 0" }}>
                        Deposit {formatCurrency(calculateDeposit(service, service.price))}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside>
          <BookingForm vendor={stylist} />
        </aside>
      </div>
    </main>
  );
}
