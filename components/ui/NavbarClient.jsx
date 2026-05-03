"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquareText } from "lucide-react";
import Logo from "@/components/brand/Logo";
import VendorNotificationsPopover from "@/components/dashboard/VendorNotificationsPopover";
import SiteButton from "@/components/ui/SiteButton";
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

function getUserInitials(sessionUser) {
  return String(sessionUser?.name || sessionUser?.email || "HF")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export default function NavbarClient({ sessionUser, links }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const isHomePage = pathname === "/";
  const dashboardHref = getDashboardHref(sessionUser);
  const dashboardLabel = getDashboardLabel(sessionUser);
  const isVendorDashboardView = sessionUser?.role === "vendor" && pathname === "/dashboard";

  const mobileLinks = useMemo(
    () =>
      links.filter((link) => {
        if (
          link.href === "/signin" ||
          link.href === "/join" ||
          link.href === "/vendor/signin" ||
          link.href === "/dashboard"
        ) {
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
    <header className={`topbar ${isHomePage ? "topbar-home" : "topbar-static"}`}>
      <div className="container">
        <div className="topbar-row">
          <Logo dark={!isHomePage || isScrolled} />

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
                {isVendorDashboardView ? (
                  <div className="topbar-vendor-tools" aria-label="Vendor dashboard shortcuts">
                    <VendorNotificationsPopover className="topbar-vendor-icon-link" />
                    <Link href="/dashboard?section=messages" className="topbar-vendor-icon-link" aria-label="Messages">
                      <MessageSquareText size={18} />
                    </Link>
                    <Link href="/dashboard?section=profile" className="topbar-vendor-avatar-link" aria-label="Profile">
                      {sessionUser.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={sessionUser.avatar}
                          alt={`${sessionUser.name || sessionUser.email || "Vendor"} avatar`}
                          className="topbar-vendor-avatar-image"
                        />
                      ) : (
                        <span className="topbar-vendor-avatar-fallback">{getUserInitials(sessionUser)}</span>
                      )}
                    </Link>
                  </div>
                ) : (
                  <SiteButton href={dashboardHref} variant="secondary" size="sm">
                    {dashboardLabel}
                  </SiteButton>
                )}
                {!isVendorDashboardView ? <SignOutButton size="sm" /> : null}
              </>
            ) : (
              <>
                <SiteButton href="/signin" variant="secondary" size="sm">
                  Sign in
                </SiteButton>
                <SiteButton href="/join" size="sm">
                  Join as stylist
                </SiteButton>
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
                  {isVendorDashboardView ? (
                    <div className="mobile-vendor-tools">
                      <VendorNotificationsPopover className="topbar-vendor-icon-link" />
                      <Link href="/dashboard?section=messages" className="topbar-vendor-icon-link" aria-label="Messages">
                        <MessageSquareText size={18} />
                      </Link>
                      <Link href="/dashboard?section=profile" className="topbar-vendor-avatar-link" aria-label="Profile">
                        {sessionUser.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={sessionUser.avatar}
                            alt={`${sessionUser.name || sessionUser.email || "Vendor"} avatar`}
                            className="topbar-vendor-avatar-image"
                          />
                        ) : (
                          <span className="topbar-vendor-avatar-fallback">{getUserInitials(sessionUser)}</span>
                        )}
                      </Link>
                    </div>
                  ) : (
                    <SiteButton href={dashboardHref} variant="secondary" fullWidth>
                      {dashboardLabel}
                    </SiteButton>
                  )}
                  {!isVendorDashboardView ? <SignOutButton fullWidth /> : null}
                </>
              ) : (
                <>
                  <SiteButton href="/signin" variant="secondary" fullWidth>
                    Sign in
                  </SiteButton>
                  <SiteButton href="/join" fullWidth>
                    Join as stylist
                  </SiteButton>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
