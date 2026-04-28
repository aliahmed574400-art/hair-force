import Image from "next/image";
import Reveal from "@/components/animated/Reveal";
import SiteButton from "@/components/ui/SiteButton";

const REVIEW_STARS = ["★", "★", "★", "★", "★"];

export default function BusinessPromoSection() {
  return (
    <Reveal style={{ padding: 34 }}>
      <div className="two-grid" style={{ alignItems: "center", gap: "64px" }}>

        <div className="section-heading" style={{ marginBottom: 0 }}>
          <span className="eyebrow">Hair Force for business</span>
          <h2 style={{ fontSize: "2.8rem" }}>Supercharge your salon</h2>
          <p style={{ maxWidth: 500 }}>
            Supercharge your business with a polished booking platform for salons,
            spas, barbers, and beauty professionals. Manage schedules, staff, and
            client demand from one refined system.
          </p>

          <div className="hero-actions" style={{ marginTop: 28, marginBottom: 36 }}>
            <SiteButton href="/join" className="window-button">
              Find out more
            </SiteButton>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", gap: 4, color: "var(--accent-color, #fbbf24)", fontSize: "1.2rem" }}>
              {REVIEW_STARS.map((star, index) => (
                <span key={`${star}-${index}`}>{star}</span>
              ))}
            </div>
            <p className="muted" style={{ margin: 0, fontSize: "0.95rem" }}>
              <strong>Excellent 5/5</strong> • Trusted by modern salon teams.
            </p>
          </div>
        </div>

        <div style={{ position: "relative", width: "100%", overflow: "hidden" }}>
          <Image
            src="/business-promo/hairforce-business-promo.png"
            alt="Hair Force business dashboard and mobile booking preview"
            width={995}
            height={567}
            style={{ width: "100%", height: "auto", display: "block" }}
            priority
          />
        </div>

      </div>
    </Reveal>
  );
}
