import Link from "next/link";
import HeroParticles from "@/components/home/HeroParticles";

function HeroLogo() {
  return (
    <div className="hero-banner-brand" aria-label="Hair Force">
      <span>Hair Force</span>
    </div>
  );
}

function OrbitTrails() {
  return (
    <svg className="hero-banner-trails" viewBox="0 0 1600 720" preserveAspectRatio="none" aria-hidden="true">
      <path d="M670 70C1020 60 1280 120 1540 30" />
      <path d="M560 250C840 208 1110 214 1520 118" />
      <path d="M620 430C920 360 1160 390 1580 290" />
      <path d="M520 590C860 500 1180 534 1600 474" />
      <path d="M950 42C1060 92 1158 136 1290 182" />
    </svg>
  );
}

export default function HeroBanner() {
  return (
    <div className="hero-banner-shell">
      <div className="hero-banner-panel">
        <HeroParticles />
        <div className="hero-banner-aurora" aria-hidden="true" />
        <div className="hero-banner-city" aria-hidden="true" />
        <OrbitTrails />

        <div className="hero-banner-copy">
          <HeroLogo />

          <h1>Book the Best Stylists in Your City</h1>

          <p>
            Discover top-rated barbers and stylists near you. Browse profiles, check availability, and
            book instantly, all in one place.
          </p>

          <div className="hero-actions hero-banner-actions">
            <Link href="/discover" className="button button-primary">
              Find a Stylist
            </Link>
            <Link href="/join" className="button button-secondary">
              Join as Stylist
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
