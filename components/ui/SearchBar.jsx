export default function SearchBar({ defaultQuery = "", defaultCity = "", defaultCategory = "" }) {
  return (
    <form className="search-shell" action="/discover">
      <input
        className="search-field"
        name="query"
        defaultValue={defaultQuery}
        placeholder="Search salons, barbers, spas, or services"
      />
      <select className="search-field" name="city" defaultValue={defaultCity}>
        <option value="">All cities</option>
        <option value="Karachi">Karachi</option>
        <option value="Lahore">Lahore</option>
        <option value="Islamabad">Islamabad</option>
        <option value="Rawalpindi">Rawalpindi</option>
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
      <button className="button button-primary" type="submit">
        Search
      </button>
    </form>
  );
}
