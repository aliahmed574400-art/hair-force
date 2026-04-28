"use client";

import { useState } from "react";
import SiteButton from "@/components/ui/SiteButton";

function VendorTable({ title, vendors, onModerate, loadingSlug }) {
  return (
    <div className="dashboard-card">
      <div className="row-between" style={{ marginBottom: 16 }}>
        <div>
          <div className="eyebrow">{title}</div>
          <h3 style={{ margin: "10px 0 0", fontFamily: "var(--font-display)", fontSize: "1.8rem" }}>
            {vendors.length} vendor{vendors.length === 1 ? "" : "s"}
          </h3>
        </div>
      </div>
      <div className="table-list">
        {vendors.length ? (
          vendors.map((vendor) => (
            <div key={vendor.slug} className="table-item">
              <div className="service-meta">
                <div>
                  <strong>{vendor.name}</strong>
                  <p className="muted tiny" style={{ margin: "8px 0 0" }}>
                    {vendor.category} - {vendor.city} - {vendor.owner}
                  </p>
                </div>
                <span className="badge">{vendor.status}</span>
              </div>
              <p className="muted tiny" style={{ marginTop: 12 }}>
                {vendor.tagline}
              </p>
              <div className="hero-actions" style={{ marginTop: 12 }}>
                <SiteButton
                  onClick={() => onModerate(vendor.slug, "active")}
                  disabled={loadingSlug === vendor.slug || vendor.status === "active"}
                  type="button"
                >
                  Approve
                </SiteButton>
                <SiteButton
                  onClick={() => onModerate(vendor.slug, "pending")}
                  disabled={loadingSlug === vendor.slug || vendor.status === "pending"}
                  type="button"
                  variant="secondary"
                >
                  Mark pending
                </SiteButton>
                <SiteButton
                  onClick={() => onModerate(vendor.slug, "rejected")}
                  disabled={loadingSlug === vendor.slug || vendor.status === "rejected"}
                  type="button"
                  variant="ghost"
                >
                  Reject
                </SiteButton>
              </div>
            </div>
          ))
        ) : (
          <div className="table-item">
            <p className="muted" style={{ margin: 0 }}>
              No vendors in this queue.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminVendorManager({ initialData }) {
  const [data, setData] = useState(initialData);
  const [status, setStatus] = useState("");
  const [loadingSlug, setLoadingSlug] = useState("");

  async function onModerate(slug, nextStatus) {
    setLoadingSlug(slug);
    setStatus("");

    try {
      const response = await fetch(`/api/admin/vendors/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to update vendor.");
      }

      setData(result);
      setStatus(`Vendor moved to ${nextStatus}.`);
    } catch (error) {
      setStatus(error.message);
    } finally {
      setLoadingSlug("");
    }
  }

  return (
    <div>
      <div className="section-heading">
        <span className="eyebrow">Admin moderation</span>
        <h1 style={{ fontSize: "clamp(2.6rem, 6vw, 4.8rem)" }}>Marketplace approval queue</h1>
        <p>
          Review pending vendor applications before they appear in public discovery. Approved vendors become visible on Hair Force search and profile flows.
        </p>
      </div>

      {status ? (
        <div className="booking-confirm">
          <span className="muted">{status}</span>
        </div>
      ) : null}

      <div className="three-grid">
        <VendorTable title="Pending" vendors={data.pendingVendors} onModerate={onModerate} loadingSlug={loadingSlug} />
        <VendorTable title="Active" vendors={data.activeVendors} onModerate={onModerate} loadingSlug={loadingSlug} />
        <VendorTable title="Rejected" vendors={data.rejectedVendors} onModerate={onModerate} loadingSlug={loadingSlug} />
      </div>
    </div>
  );
}
