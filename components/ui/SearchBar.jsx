const STATES = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
];

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
        <option value="">All states</option>
        {STATES.map((state) => (
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
      <button className="button button-primary" type="submit">
        Search
      </button>
    </form>
  );
}
