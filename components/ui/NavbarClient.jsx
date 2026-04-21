"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/brand/Logo";
import SignOutButton from "@/components/ui/SignOutButton";

function getDashboardHref(sessionUser) {
  return sessionUser?.role === "admin" ? "/admin" : "/dashboard";
}

function getDashboardLabel(sessionUser) {
  if (!sessionUser) {
    return "Dashboard";
  }

  if (sessionUser.role === "vendor") {
    return "Vendor dashboard";
  }

  if (sessionUser.role === "admin") {
    return "Admin panel";
  }

  return "My dashboard";
}

export default function NavbarClient({ sessionUser, links }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const dashboardHref = getDashboardHref(sessionUser);
  const dashboardLabel = getDashboardLabel(sessionUser);

  const mobileLinks = useMemo(
    () =>
      links.filter((link) => {
        if (link.href === "/signin" || link.href === "/join" || link.href === "/dashboard") {
          return false;
        }

        return true;
      }),
    [links]
  );

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth > 900) {
        setIsMenuOpen(false);
      }
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    function syncScrollState() {
      setIsScrolled(window.scrollY > 24);
    }

    syncScrollState();
    window.addEventListener("scroll", syncScrollState, { passive: true });

    return () => window.removeEventListener("scroll", syncScrollState);
  }, []);

  return (
    <>
      <div className="topbar-row">
        <Logo dark={isScrolled} />

        <nav className="nav-links" aria-label="Primary navigation">
          {links.map((link) =>
            link.href ? (
              <Link key={`${link.label}-${link.href}`} href={link.href}>
                {link.label}
              </Link>
            ) : (
              <span key={`${link.label}-static`}>{link.label}</span>
            )
          )}
        </nav>

        <div className="nav-actions">
          {sessionUser ? (
            <>
              <Link href={dashboardHref} className="button button-secondary">
                {dashboardLabel}
              </Link>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link href="/signin" className="button button-secondary">
                Sign in
              </Link>
              <Link href="/join" className="button button-primary">
                Join as stylist
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className={`topbar-mobile-toggle ${isMenuOpen ? "is-open" : ""}`}
          aria-expanded={isMenuOpen}
          aria-controls="mobile-nav-panel"
          aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <div className={`mobile-nav-drawer ${isMenuOpen ? "is-open" : ""}`}>
        <div id="mobile-nav-panel" className="mobile-nav-panel" aria-hidden={!isMenuOpen}>
          <nav className="mobile-nav-links" aria-label="Mobile navigation">
            {mobileLinks.map((link) =>
              link.href ? (
                <Link key={`${link.label}-${link.href}`} href={link.href}>
                  {link.label}
                </Link>
              ) : (
                <span key={`${link.label}-static`}>{link.label}</span>
              )
            )}
          </nav>

          <div className="mobile-nav-divider" />

          <div className="mobile-nav-actions">
            {sessionUser ? (
              <>
                <Link href={dashboardHref} className="button button-secondary">
                  {dashboardLabel}
                </Link>
                <SignOutButton className="button button-secondary" />
              </>
            ) : (
              <>
                <Link href="/signin" className="button button-secondary">
                  Sign in
                </Link>
                <Link href="/join" className="button button-primary">
                  Join as stylist
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
