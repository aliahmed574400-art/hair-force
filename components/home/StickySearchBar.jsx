"use client";

import { useMemo, useState } from "react";
import SiteButton from "@/components/ui/SiteButton";
import { US_STATES } from "@/lib/discovery";

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
                  <select name="state" defaultValue="">
                    <option value="">Choose state</option>
                    {US_STATES.map((state) => (
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

                <SiteButton className="sticky-search-button" fullWidth type="submit">
                  Search
                </SiteButton>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
