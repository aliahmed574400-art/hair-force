import Link from "next/link";

export default function Logo() {
  return (
    <Link href="/" className="brand" aria-label="Hair Force home">
      <svg width="46" height="34" viewBox="0 0 92 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="hairforce-gradient" x1="12" y1="8" x2="82" y2="56" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6FA2FF" />
            <stop offset="0.55" stopColor="#4A69FF" />
            <stop offset="1" stopColor="#53DFFF" />
          </linearGradient>
        </defs>
        <path
          d="M12 50L19 14C19.5 11.4 21.8 9.5 24.5 9.5H42L39 25H31.5L27 50H12Z"
          fill="url(#hairforce-gradient)"
        />
        <path
          d="M36 50L43 14C43.5 11.4 45.8 9.5 48.5 9.5H66L62.8 25H55.4L50.8 50H36Z"
          fill="url(#hairforce-gradient)"
          opacity="0.88"
        />
        <path
          d="M31 33.5H78.2C81.6 33.5 83.7 37.3 81.9 40.1L77.7 46.7C76.8 48.2 75.2 49 73.5 49H26L31 33.5Z"
          fill="url(#hairforce-gradient)"
        />
      </svg>
      <span>
        <span style={{ fontSize: "1.32rem" }}>Hair Force</span>
        <span className="brand-sub">Premium stylist marketplace</span>
      </span>
    </Link>
  );
}
