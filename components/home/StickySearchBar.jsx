"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const CITIES = ["Karachi", "Lahore", "Islamabad", "Rawalpindi"];
const SERVICES = ["Haircut", "Beard", "Styling", "Coloring", "Facial"];

export default function StickySearchBar() {
  const [isDocked, setIsDocked] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");

  useEffect(() => {
    function handleScroll() {
      setIsDocked(window.scrollY > 260);
    }

    const today = new Date();
    setSelectedDate(today.toISOString().slice(0, 10));
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section className="section-tight sticky-search-section" aria-label="Search and filters">
      <div className="container">
        <div className={cn("sticky-search-dock", isDocked && "is-docked")}>
          <form className="sticky-search-card" action="/discover">
            <label className="sticky-search-field">
              <span className="sticky-search-label">Location</span>
              <select name="city" defaultValue="">
                <option value="">Choose city</option>
                {CITIES.map((city) => (
                  <option key={city} value={city}>
                    {city}
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
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
              />
            </label>

            <button className="button button-primary sticky-search-button" type="submit">
              Search
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
