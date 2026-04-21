"use client";

import { useMemo, useState } from "react";

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
const SERVICES = [
  "Haircut",
  "Beard",
  "Styling",
  "Coloring",
  "Facial",
  "Nails",
  "Skin Care",
  "Brows & Lashes",
  "Massage",
  "Makeup",
  "Wellness & Spa",
  "Braids & Locs",
  "Hair Removal",
  "Others",
];

export default function StickySearchBar() {
  const [selectedDate, setSelectedDate] = useState("");
  const fallbackDate = useMemo(() => new Date().toISOString().slice(0, 10), []);

  return (
    <section className="section-tight sticky-search-section" aria-label="Search and filters">
      <div className="container">
        <div className="home-section-shell home-search-shell">
          <div className="home-section-panel home-search-panel">
            <div className="sticky-search-dock">
              <form className="sticky-search-card" action="/discover">
                <label className="sticky-search-field">
                  <span className="sticky-search-label">Location</span>
                  <select name="city" defaultValue="">
                    <option value="">Choose state</option>
                    {STATES.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="sticky-search-field">
                  <span className="sticky-search-label">Service type</span>
                  <select name="query" defaultValue="">
                    <option value="">Select service</option>
                    {SERVICES.map((service) => (
                      <option key={service} value={service}>
                        {service}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="sticky-search-field">
                  <span className="sticky-search-label">Date</span>
                  <input
                    name="date"
                    type="date"
                    value={selectedDate || fallbackDate}
                    onChange={(event) => setSelectedDate(event.target.value)}
                  />
                </label>

                <button className="button button-primary sticky-search-button" type="submit">
                  Search
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
