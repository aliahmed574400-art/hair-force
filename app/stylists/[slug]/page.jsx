import { notFound } from "next/navigation";
import StylistProfileExperience from "@/components/stylists/StylistProfileExperience";
import { getStylistBySlug } from "@/lib/postgres-repositories";

export default async function StylistProfilePage({ params }) {
  const stylist = await getStylistBySlug(params.slug);

  if (!stylist) {
    notFound();
  }

  return <StylistProfileExperience stylist={stylist} />;
}
