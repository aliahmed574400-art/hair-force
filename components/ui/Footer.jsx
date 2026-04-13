import Link from "next/link";
import HeroParticles from "@/components/home/HeroParticles";

function SocialIcon({ label, href, path }) {
  return (
    <a
      className="social-link footer-social-link"
      href={href}
      aria-label={label}
      title={label}
      target="_blank"
      rel="noreferrer"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d={path} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      </svg>
    </a>
  );
}

export default function Footer() {
  return (
    <footer className="footer footer-cosmic" id="contact">
      <div className="container">
        <div className="footer-shell">
          <HeroParticles className="footer-particles-canvas" mobileCount={120} desktopCount={210} />
          <div className="footer-shell-glow" aria-hidden="true" />
          <div className="footer-shell-planet" aria-hidden="true" />

          <div className="footer-cta-block">
            <h2>Become a Stylist</h2>
            <p>
              Grow your business with Hair Force. Join now and connect with more clients in your
              area.
            </p>
            <Link href="/join" className="button button-primary footer-cta-button">
              Get Started
            </Link>
          </div>

          <div className="footer-divider" aria-hidden="true" />

          <nav className="footer-link-row footer-link-row-centered" id="privacy" aria-label="Footer navigation">
            <Link href="/discover">Browse Stylists</Link>
            <Link href="/dashboard">Bookings</Link>
            <Link href="/#faqs">FAQs</Link>
            <Link href="/#contact">Contact</Link>
            <Link href="/#privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </nav>

          <div className="footer-socials footer-socials-centered" aria-label="Social links">
            <SocialIcon
              label="Facebook"
              href="https://www.facebook.com"
              path="M13.2 20V12.8h2.3l.4-2.7h-2.7V8.4c0-.8.2-1.3 1.4-1.3H16V4.7c-.3 0-1-.1-2-.1-2 0-3.4 1.2-3.4 3.5v2H8.5v2.7h2.1V20"
            />
            <SocialIcon
              label="Twitter"
              href="https://www.twitter.com"
              path="M19.2 7.2c-.5.2-1.1.4-1.7.5a3 3 0 0 0 1.3-1.6c-.6.4-1.3.6-2 .8a3 3 0 0 0-5.2 2c0 .2 0 .4.1.7A8.5 8.5 0 0 1 5 6.8a3 3 0 0 0 .9 4c-.5 0-.9-.2-1.3-.4 0 1.5 1.1 2.8 2.5 3.1-.4.1-.8.2-1.2.1.4 1.2 1.5 2.1 2.9 2.1A6.1 6.1 0 0 1 5 17.1a8.6 8.6 0 0 0 4.7 1.4c5.6 0 8.7-4.7 8.7-8.7v-.4c.6-.4 1.1-1 1.5-1.7Z"
            />
            <SocialIcon
              label="YouTube"
              href="https://www.youtube.com"
              path="M21 12c0 2.2-.2 3.6-.5 4.3-.3.7-.8 1.2-1.5 1.5-.7.3-2.5.5-5 .5s-4.3-.2-5-.5c-.7-.3-1.2-.8-1.5-1.5C6.2 15.6 6 14.2 6 12s.2-3.6.5-4.3c.3-.7.8-1.2 1.5-1.5.7-.3 2.5-.5 5-.5s4.3.2 5 .5c.7.3 1.2.8 1.5 1.5.3.7.5 2.1.5 4.3Zm-9-2.3v4.6l3.9-2.3L12 9.7Z"
            />
            <SocialIcon
              label="Instagram"
              href="https://www.instagram.com"
              path="M8 3.8h8A4.2 4.2 0 0 1 20.2 8v8A4.2 4.2 0 0 1 16 20.2H8A4.2 4.2 0 0 1 3.8 16V8A4.2 4.2 0 0 1 8 3.8Zm4 4.2a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm4.5-.7h.1"
            />
          </div>
        </div>
      </div>
    </footer>
  );
}
