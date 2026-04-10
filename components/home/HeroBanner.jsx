import Link from "next/link";
import HeroParticles from "@/components/home/HeroParticles";

function HeroLogo() {
  return (
    <div className="hero-banner-brand" aria-label="Hair Force">
      <svg width="56" height="40" viewBox="0 0 92 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="hero-logo-gradient" x1="12" y1="8" x2="82" y2="56" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6FA2FF" />
            <stop offset="0.55" stopColor="#3156FF" />
            <stop offset="1" stopColor="#53DFFF" />
          </linearGradient>
        </defs>
        <path
          d="M12 50L19 14C19.5 11.4 21.8 9.5 24.5 9.5H42L39 25H31.5L27 50H12Z"
          fill="url(#hero-logo-gradient)"
        />
        <path
          d="M36 50L43 14C43.5 11.4 45.8 9.5 48.5 9.5H66L62.8 25H55.4L50.8 50H36Z"
          fill="url(#hero-logo-gradient)"
          opacity="0.9"
        />
        <path
          d="M31 33.5H78.2C81.6 33.5 83.7 37.3 81.9 40.1L77.7 46.7C76.8 48.2 75.2 49 73.5 49H26L31 33.5Z"
          fill="url(#hero-logo-gradient)"
        />
      </svg>
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

function CornerSpark() {
  return (
    <svg className="hero-banner-spark" viewBox="0 0 48 48" aria-hidden="true">
      <path
        d="M24 2l3.4 14.6L42 20l-14.6 3.4L24 38l-3.4-14.6L6 20l14.6-3.4L24 2Z"
        fill="rgba(255,255,255,0.86)"
      />
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
        <CornerSpark />

        <div className="hero-banner-copy">
          <HeroLogo />

          <h1>
            Book the Best.
            <br />
            Stylists in Your City
          </h1>

          <p>
            Seamlessly book top barbers and stylists in seconds.
            <br />
            Find your perfect stylist today.
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
