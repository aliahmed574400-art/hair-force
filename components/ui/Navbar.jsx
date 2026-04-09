import Link from "next/link";
import Logo from "@/components/brand/Logo";
import SignOutButton from "@/components/ui/SignOutButton";
import { getSessionFromServer } from "@/lib/session";

const links = [
  { href: "/discover", label: "Browse Stylists" },
  { href: "/join", label: "Become a Stylist" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/signin", label: "Sign In" }
];

export default function Navbar() {
  const sessionUser = getSessionFromServer();

  return (
    <header className="topbar">
      <div className="container topbar-row">
        <Logo />
        <nav className="nav-links">
          {links.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="nav-actions">
          <Link href="/discover" className="button button-secondary">
            Find a stylist
          </Link>
          {sessionUser ? (
            <>
              <Link
                href={sessionUser.role === "admin" ? "/admin" : "/dashboard"}
                className="button button-secondary"
              >
                {sessionUser.role === "vendor"
                  ? "Vendor dashboard"
                  : sessionUser.role === "admin"
                    ? "Admin panel"
                    : "My dashboard"}
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
      </div>
    </header>
  );
}
