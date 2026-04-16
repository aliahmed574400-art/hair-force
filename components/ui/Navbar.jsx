import { getSessionFromServer } from "@/lib/session";
import NavbarClient from "@/components/ui/NavbarClient";

const links = [
  { href: "/discover", label: "Browse Stylists" },
  { href: "/about", label: "About Us" },
  { href: "/ai", label: "Hairforce AI" }
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
