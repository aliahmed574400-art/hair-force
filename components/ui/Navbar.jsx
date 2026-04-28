import { getSessionFromServer } from "@/lib/session";
import NavbarClient from "@/components/ui/NavbarClient";

const links = [
  { label: "Browse Stylists" },
  { href: "/about", label: "About Us" },
  { href: "/ai", label: "Hairforce AI" }
];

export default async function Navbar() {
  const sessionUser = await getSessionFromServer();

  return <NavbarClient sessionUser={sessionUser} links={links} />;
}
