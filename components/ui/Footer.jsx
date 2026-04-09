import Link from "next/link";
import Logo from "@/components/brand/Logo";

function SocialIcon({ label, path }) {
  return (
    <span className="social-link" aria-label={label} title={label}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d={path} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      </svg>
    </span>
  );
}

export default function Footer() {
  return (
    <footer className="footer" id="contact">
      <div className="container">
        <div className="footer-shell">
          <div>
            <Logo />
            <p className="muted" style={{ marginTop: 14, maxWidth: 460 }}>
              Hair Force is a premium multi-vendor marketplace for salons, barbers, spas, beauty parlors, and independent stylists built around trust-heavy profiles and fast booking.
            </p>
          </div>

          <div className="footer-link-row">
            <Link href="/discover">Browse Stylists</Link>
            <Link href="/dashboard">Bookings</Link>
            <Link href="/#faqs">FAQs</Link>
            <Link href="/#contact">Contact</Link>
            <Link href="/#privacy">Privacy</Link>
          </div>

          <div className="footer-bottom" id="privacy">
            <p className="muted" style={{ margin: 0 }}>
              &copy; 2026 Hair Force. Designed for premium beauty booking experiences.
            </p>
            <div className="footer-socials" aria-label="Social links">
              <SocialIcon
                label="Instagram"
                path="M8 3.8h8A4.2 4.2 0 0 1 20.2 8v8A4.2 4.2 0 0 1 16 20.2H8A4.2 4.2 0 0 1 3.8 16V8A4.2 4.2 0 0 1 8 3.8Zm4 4.2a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm4.5-.7h.1"
              />
              <SocialIcon
                label="Facebook"
                path="M13.2 20V12.8h2.3l.4-2.7h-2.7V8.4c0-.8.2-1.3 1.4-1.3H16V4.7c-.3 0-1-.1-2-.1-2 0-3.4 1.2-3.4 3.5v2H8.5v2.7h2.1V20"
              />
              <SocialIcon
                label="YouTube"
                path="M21 12c0 2.2-.2 3.6-.5 4.3-.3.7-.8 1.2-1.5 1.5-.7.3-2.5.5-5 .5s-4.3-.2-5-.5c-.7-.3-1.2-.8-1.5-1.5C6.2 15.6 6 14.2 6 12s.2-3.6.5-4.3c.3-.7.8-1.2 1.5-1.5.7-.3 2.5-.5 5-.5s4.3.2 5 .5c.7.3 1.2.8 1.5 1.5.3.7.5 2.1.5 4.3Zm-9-2.3v4.6l3.9-2.3L12 9.7Z"
              />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
