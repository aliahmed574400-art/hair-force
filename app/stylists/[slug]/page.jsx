import { notFound } from "next/navigation";
import StylistProfileExperience from "@/components/stylists/StylistProfileExperience";
import { getStylistBySlug, isFavoriteStylist } from "@/lib/postgres-repositories";
import { getSessionFromServer } from "@/lib/session";

export default async function StylistProfilePage({ params }) {
  const [stylist, user] = await Promise.all([
    getStylistBySlug(params.slug),
    getSessionFromServer()
  ]);

  if (!stylist) {
    notFound();
  }

  const isLiked = user?.role === "client" ? await isFavoriteStylist(user, params.slug) : false;

  return <StylistProfileExperience stylist={stylist} user={user} isLiked={isLiked} />;
}
