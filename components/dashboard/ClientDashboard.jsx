"use client";

import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

export default function ClientDashboard({ user, initialData }) {
  return (
    <div>
      <div className="section-heading">
        <span className="eyebrow">Client dashboard</span>
        <h1 style={{ fontSize: "clamp(2.6rem, 6vw, 4.6rem)" }}>Welcome back, {user.name}</h1>
        <p>
          Track upcoming appointments, payment status, and quickly rebook your favorite Hair Force vendors.
        </p>
      </div>

      <div className="two-grid">
        <div className="dashboard-card">
          <h3 style={{ marginTop: 0, fontFamily: "var(--font-display)", fontSize: "1.8rem" }}>
            Upcoming bookings
          </h3>
          <div className="table-list">
            {initialData.bookings.length ? (
              initialData.bookings.map((booking) => (
                <div key={booking.id} className="table-item">
                  <div className="service-meta">
                    <div>
                      <strong>{booking.vendorName}</strong>
                      <p className="muted tiny" style={{ margin: "8px 0 0" }}>
                        {booking.serviceName}
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <strong>{booking.appointmentSlot}</strong>
                      <p className="muted tiny" style={{ margin: "8px 0 0" }}>
                        {booking.appointmentDate}
                      </p>
                    </div>
                  </div>
                  <div className="chip-row" style={{ marginTop: 12 }}>
                    <span className="chip">Total {formatCurrency(booking.total)}</span>
                    <span className="chip">Deposit {formatCurrency(booking.depositAmount || 0)}</span>
                    <span className="chip">{booking.paymentStatus}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="table-item">
                <p className="muted" style={{ margin: 0 }}>
                  You have no bookings yet. Browse stylists and reserve your first slot.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-card">
          <h3 style={{ marginTop: 0, fontFamily: "var(--font-display)", fontSize: "1.8rem" }}>
            Rebook suggestions
          </h3>
          <div className="timeline">
            {initialData.recommendations.map((vendor) => (
              <div key={vendor.slug} className="timeline-item">
                <strong>{vendor.name}</strong>
                <p className="muted tiny" style={{ marginBottom: 12 }}>
                  {vendor.category} - {vendor.city}
                </p>
                <div className="hero-actions">
                  <Link href={`/stylists/${vendor.slug}`} className="button button-secondary">
                    View profile
                  </Link>
                  <Link href={`/book/${vendor.slug}`} className="button button-primary">
                    Book again
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
