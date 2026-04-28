import DiscoverExperience from "@/components/discover/DiscoverExperience";
import { searchDiscoverStylists } from "@/lib/postgres-repositories";

function getParamValue(value) {
  if (Array.isArray(value)) {
    return value[0] || "";
  }

  return value || "";
}

export default async function DiscoverPage({ searchParams }) {
  const initialFilters = {
    query: getParamValue(searchParams?.query),
    state: getParamValue(searchParams?.state) || getParamValue(searchParams?.city),
    sort: getParamValue(searchParams?.sort) || "highest_rated",
    priceRange: getParamValue(searchParams?.priceRange),
    verifiedOnly: getParamValue(searchParams?.verifiedOnly),
    instantOnly: getParamValue(searchParams?.instantOnly),
    page: 1,
    limit: 12
  };
  const initialResults = await searchDiscoverStylists(initialFilters);

  return <DiscoverExperience initialFilters={initialFilters} initialResults={initialResults} />;
}
