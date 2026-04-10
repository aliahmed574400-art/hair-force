import Link from "next/link";
import Reveal from "@/components/animated/Reveal";
import SearchBar from "@/components/ui/SearchBar";
import { categories, cities } from "@/lib/data";
import { getStylists } from "@/lib/postgres-repositories";
import { formatCurrency } from "@/lib/utils";

function ActiveFilters({ query, city, category }) {
  const values = [query, city, category].filter(Boolean);

  if (!values.length) {
    return <span className="muted">Showing every active Hair Force vendor.</span>;
  }

  return (
    <div className="chip-row">
      {values.map((value) => (
        <span key={value} className="chip">
          {value}
        </span>
      ))}
    </div>
  );
}

export default async function DiscoverPage({ searchParams }) {
  const filters = {
    query: searchParams?.query || "",
    city: searchParams?.city || "",
    category: searchParams?.category || ""
  };

  const stylists = await getStylists(filters);

  return (
    <main className="section page-intro">
      <div className="container">
        <div className="section-heading">
          <span className="eyebrow">Discover vendors</span>
          <h1 style={{ fontSize: "clamp(2.6rem, 6vw, 4.8rem)" }}>Find the right stylist faster</h1>
          <p>
            Marketplace-style discovery with location, category, specialties, transparent pricing, and direct booking calls to action.
          </p>
        </div>
        <SearchBar
          defaultQuery={filters.query}
          defaultCity={filters.city}
          defaultCategory={filters.category}
        />

        <div className="row-between" style={{ margin: "18px 0 24px" }}>
          <ActiveFilters {...filters} />
          <span className="muted">
            {stylists.length} vendor{stylists.length === 1 ? "" : "s"} found
          </span>
        </div>

        <div className="three-grid">
          {stylists.map((stylist, index) => (
            <Reveal key={stylist.slug} className="portrait-card" delay={index * 0.05}>
              <div className="portrait" />
              <div className="card-body">
                <div className="card-title">
                  <div>
                    <h3>{stylist.name}</h3>
                    <span className="muted tiny">
                      {stylist.category} • {stylist.city}
                    </span>
                  </div>
                  <span className="badge">{stylist.rating}</span>
                </div>
                <p className="muted tiny">{stylist.location}</p>
                <p className="muted" style={{ marginTop: 14, minHeight: 68 }}>
                  {stylist.tagline}
                </p>
                <div className="chip-row">
                  {stylist.specialties.slice(0, 3).map((item) => (
                    <span key={item} className="chip">
                      {item}
                    </span>
                  ))}
                </div>
                <div className="service-meta" style={{ marginTop: 18 }}>
                  <strong>From {formatCurrency(stylist.priceFrom)}</strong>
                  <span className="muted tiny">{stylist.reviewCount} reviews</span>
                </div>
                <div className="hero-actions" style={{ marginTop: 16 }}>
                  <Link href={`/stylists/${stylist.slug}`} className="button button-secondary">
                    View profile
                  </Link>
                  <Link href={`/book/${stylist.slug}`} className="button button-primary">
                    Book
                  </Link>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {stylists.length === 0 ? (
          <div className="surface" style={{ padding: 28, marginTop: 24 }}>
            <h3 style={{ margin: "0 0 10px", fontFamily: "var(--font-display)" }}>No matches yet</h3>
            <p className="muted" style={{ marginBottom: 18 }}>
              Try another city, broader category, or a simpler service keyword.
            </p>
            <div className="chip-row">
              {categories.concat(cities).slice(0, 6).map((item) => (
                <Link key={item} href={`/discover?query=${encodeURIComponent(item)}`} className="chip">
                  {item}
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
