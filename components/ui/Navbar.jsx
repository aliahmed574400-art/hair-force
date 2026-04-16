import { getSessionFromServer } from "@/lib/session";
import NavbarClient from "@/components/ui/NavbarClient";

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
      <div className="container">
        <NavbarClient sessionUser={sessionUser} links={links} />
      </div>
    </header>
  );
}
