import SiteButton from "@/components/ui/SiteButton";
import { US_STATES } from "@/lib/discovery";

export default function SearchBar({
  defaultQuery = "",
  defaultState = "",
  defaultCity = "",
  defaultCategory = ""
}) {
  const initialState = defaultState || defaultCity;

  return (
    <form className="search-shell" action="/discover">
      <input
        className="search-field"
        name="query"
        defaultValue={defaultQuery}
        placeholder="Search salons, barbers, spas, or services"
      />
      <select className="search-field" name="state" defaultValue={initialState}>
        <option value="">All states</option>
        {US_STATES.map((state) => (
          <option key={state} value={state}>
            {state}
          </option>
        ))}
      </select>
      <select className="search-field" name="category" defaultValue={defaultCategory}>
        <option value="">All categories</option>
        <option value="Salon">Salon</option>
        <option value="Barber">Barber</option>
        <option value="Spa">Spa</option>
        <option value="Makeup">Makeup</option>
        <option value="Nails">Nails</option>
        <option value="Braids">Braids</option>
      </select>
      <SiteButton type="submit">Search</SiteButton>
    </form>
  );
}
