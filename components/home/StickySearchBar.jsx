"use client";

import HeroSearch from "@/components/home/HeroSearch";

export default function StickySearchBar() {
  return (
    <section className="section-tight sticky-search-section" aria-label="Quick landing page search">
      <div className="container">
        <div className="home-section-shell home-search-shell">
          <div className="home-section-panel home-search-panel">
            <div className="sticky-search-dock">
              <HeroSearch />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
