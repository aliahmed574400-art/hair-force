import { notFound } from "next/navigation";
import StylistProfileExperience from "@/components/stylists/StylistProfileExperience";
import { getStylistBySlug } from "@/lib/postgres-repositories";
import { getSessionFromServer } from "@/lib/session";

export default async function StylistProfilePage({ params }) {
  const [stylist, user] = await Promise.all([
    getStylistBySlug(params.slug),
    getSessionFromServer()
  ]);

  if (!stylist) {
    notFound();
  }

  return <StylistProfileExperience stylist={stylist} user={user} />;
}
