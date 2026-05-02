"use client";

import Link from "next/link";
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Clock3,
  Filter,
  LocateFixed,
  MapPinned,
  ShieldCheck,
  Sparkles,
  Star
} from "lucide-react";
import DiscoverMap from "@/components/discover/DiscoverMap";
import SiteButton from "@/components/ui/SiteButton";
import {
  DISCOVER_PRICE_OPTIONS,
  DISCOVER_SORT_OPTIONS,
  US_STATES,
  buildVendorLocationLabel,
  formatReviewCount
} from "@/lib/discovery";
import { formatCurrency } from "@/lib/utils";

const RESULTS_LIMIT = 12;
const LOCATION_PROMPT_STORAGE_KEY = "hairforce-discover-location-dismissed";

function buildBookingHref(stylist) {
  const serviceId = stylist.topServices?.[0]?.id || "";
  return serviceId ? `/book/${stylist.slug}?service=${serviceId}` : `/book/${stylist.slug}`;
}

function getLocationErrorMessage(error) {
  if (!error) {
    return "Unable to fetch your location right now.";
  }

  if (error.code === 1) {
    return "Location permission was denied. You can still browse manually by state.";
  }

  if (error.code === 2) {
    return "Location is unavailable right now. Try again in a moment.";
  }

  return "Unable to fetch your location right now.";
}

function ActiveMapPreview({ stylist }) {
  if (!stylist) {
    return null;
  }

  return (
    <div className="discover-map-preview">
      <div className="discover-map-preview-head">
        <span className="badge badge-accent">{stylist.category}</span>
        <span className="badge">{stylist.distanceLabel || stylist.cityStateLabel}</span>
      </div>
      <h3>{stylist.name}</h3>
      <p className="muted">
        {stylist.locationLabel || buildVendorLocationLabel(stylist)}
      </p>
      <div className="discover-card-rating">
        <Star size={15} />
        <span>
          {stylist.rating} · {formatReviewCount(stylist.reviewCount)} reviews
        </span>
      </div>
      <div className="hero-actions" style={{ marginTop: 14 }}>
        <SiteButton href={`/stylists/${stylist.slug}`} size="sm">
          View profile
        </SiteButton>
        <SiteButton href={buildBookingHref(stylist)} variant="secondary" size="sm">
          Book
        </SiteButton>
      </div>
    </div>
  );
}

function StylistResultCard({ stylist, active, onActivate }) {
  return (
    <article
      className={`discover-card ${active ? "active" : ""}`}
      onMouseEnter={() => onActivate(stylist.slug)}
      onFocus={() => onActivate(stylist.slug)}
    >
      <Link href={`/stylists/${stylist.slug}`} className="discover-card-media">
        {stylist.avatar || stylist.coverImage ? (
          <img
            src={stylist.avatar || stylist.coverImage}
            alt={stylist.name}
            className="discover-card-image"
          />
        ) : (
          <div className="discover-card-image discover-card-image-fallback">
            {String(stylist.name || "HF")
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part.charAt(0).toUpperCase())
              .join("")}
          </div>
        )}
      </Link>

      <div className="discover-card-body">
        <div className="discover-card-topline">
          <div>
            <div className="discover-card-name-row">
              <Link href={`/stylists/${stylist.slug}`} className="discover-card-name">
                {stylist.name}
              </Link>
              {stylist.verified ? (
                <span className="discover-inline-flag">
                  <ShieldCheck size={14} />
                  Verified
                </span>
              ) : null}
            </div>
            <p className="discover-card-location">{stylist.locationLabel || stylist.cityStateLabel}</p>
          </div>

          <div className="discover-card-rating">
            <Star size={15} />
            <span>
              {stylist.rating} · {formatReviewCount(stylist.reviewCount)}
            </span>
          </div>
        </div>

        <div className="chip-row discover-card-badges">
          {stylist.badges?.map((badge) => (
            <span key={badge} className="chip">
              {badge}
            </span>
          ))}
          {stylist.distanceLabel ? <span className="chip">{stylist.distanceLabel}</span> : null}
        </div>

        <div className="discover-card-meta-row">
          <span className="discover-card-price">From {formatCurrency(stylist.priceFrom || 0)}</span>
          {stylist.nextAvailabilityLabel ? (
            <span className="discover-inline-meta">
              <Clock3 size={15} />
              {stylist.nextAvailabilityLabel}
            </span>
          ) : (
            <span className="discover-inline-meta">No live times posted yet</span>
          )}
        </div>

        <div className="chip-row">
          {(stylist.topServices || []).slice(0, 3).map((service) => (
            <span key={service.id} className="chip discover-service-chip">
              {service.title}
            </span>
          ))}
        </div>

        <div className="hero-actions discover-card-actions">
          <SiteButton href={`/stylists/${stylist.slug}`} size="sm">
            View profile
          </SiteButton>
          <SiteButton href={buildBookingHref(stylist)} variant="secondary" size="sm">
            Book
          </SiteButton>
        </div>
      </div>
    </article>
  );
}

export default function DiscoverExperience({ initialFilters, initialResults }) {
  const router = useRouter();
  const pathname = usePathname();
  const [filters, setFilters] = useState({
    query: initialFilters.query || "",
    state: initialFilters.state || "",
    sort: initialFilters.sort || "highest_rated",
    priceRange: initialFilters.priceRange || "",
    verifiedOnly: initialFilters.verifiedOnly === true || initialFilters.verifiedOnly === "1",
    instantOnly: initialFilters.instantOnly === true || initialFilters.instantOnly === "1"
  });
  const [results, setResults] = useState(initialResults);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [activeSlug, setActiveSlug] = useState(initialResults.stylists?.[0]?.slug || "");
  const [mobileMapOpen, setMobileMapOpen] = useState(false);
  const [locationPromptVisible, setLocationPromptVisible] = useState(false);
  const [nearby, setNearby] = useState({
    loading: false,
    error: "",
    coords: null,
    label: ""
  });
  const deferredQuery = useDeferredValue(filters.query);
  const activeStylist =
    results.stylists.find((stylist) => stylist.slug === activeSlug) || results.stylists[0] || null;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const dismissed = window.localStorage.getItem(LOCATION_PROMPT_STORAGE_KEY) === "1";
    setLocationPromptVisible(!dismissed);
  }, []);

  useEffect(() => {
    if (!results.stylists.some((stylist) => stylist.slug === activeSlug)) {
      setActiveSlug(results.stylists[0]?.slug || "");
    }
  }, [activeSlug, results.stylists]);

  useEffect(() => {
    const params = new URLSearchParams();

    if (filters.query.trim()) {
      params.set("query", filters.query.trim());
    }

    if (filters.state) {
      params.set("state", filters.state);
    }

    if (filters.sort && filters.sort !== "highest_rated") {
      params.set("sort", filters.sort);
    }

    if (filters.priceRange) {
      params.set("priceRange", filters.priceRange);
    }

    if (filters.verifiedOnly) {
      params.set("verifiedOnly", "1");
    }

    if (filters.instantOnly) {
      params.set("instantOnly", "1");
    }

    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    startTransition(() => {
      router.replace(nextUrl, { scroll: false });
    });
  }, [filters.instantOnly, filters.priceRange, filters.query, filters.sort, filters.state, filters.verifiedOnly, pathname, router]);

  useEffect(() => {
    let cancelled = false;

    async function fetchResults() {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          page: "1",
          limit: String(RESULTS_LIMIT),
          sort: filters.sort
        });

        if (deferredQuery.trim()) {
          params.set("query", deferredQuery.trim());
        }

        if (filters.state) {
          params.set("state", filters.state);
        }

        if (filters.priceRange) {
          params.set("priceRange", filters.priceRange);
        }

        if (filters.verifiedOnly) {
          params.set("verifiedOnly", "1");
        }

        if (filters.instantOnly) {
          params.set("instantOnly", "1");
        }

        if (nearby.coords?.lat && nearby.coords?.lng) {
          params.set("nearLat", String(nearby.coords.lat));
          params.set("nearLng", String(nearby.coords.lng));
        }

        const response = await fetch(`/api/stylists?${params.toString()}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to load stylists.");
        }

        if (!cancelled) {
          setResults(data);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchResults();

    return () => {
      cancelled = true;
    };
  }, [
    deferredQuery,
    filters.instantOnly,
    filters.priceRange,
    filters.sort,
    filters.state,
    filters.verifiedOnly,
    nearby.coords?.lat,
    nearby.coords?.lng
  ]);

  async function loadMoreResults() {
    setLoadingMore(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: String((results.meta?.page || 1) + 1),
        limit: String(RESULTS_LIMIT),
        sort: filters.sort
      });

      if (deferredQuery.trim()) {
        params.set("query", deferredQuery.trim());
      }

      if (filters.state) {
        params.set("state", filters.state);
      }

      if (filters.priceRange) {
        params.set("priceRange", filters.priceRange);
      }

      if (filters.verifiedOnly) {
        params.set("verifiedOnly", "1");
      }

      if (filters.instantOnly) {
        params.set("instantOnly", "1");
      }

      if (nearby.coords?.lat && nearby.coords?.lng) {
        params.set("nearLat", String(nearby.coords.lat));
        params.set("nearLng", String(nearby.coords.lng));
      }

      const response = await fetch(`/api/stylists?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load more stylists.");
      }

      setResults((current) => ({
        stylists: [...current.stylists, ...(data.stylists || [])],
        meta: data.meta || current.meta
      }));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoadingMore(false);
    }
  }

  function dismissLocationPrompt() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LOCATION_PROMPT_STORAGE_KEY, "1");
    }

    setLocationPromptVisible(false);
  }

  function clearNearby() {
    setNearby({ loading: false, error: "", coords: null, label: "" });
  }

  function requestNearby() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setNearby({
        loading: false,
        error: "Geolocation is not available in this browser.",
        coords: null,
        label: ""
      });
      dismissLocationPrompt();
      return;
    }

    setNearby({ loading: true, error: "", coords: null, label: "" });

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = Number(position.coords.latitude.toFixed(6));
          const lng = Number(position.coords.longitude.toFixed(6));
          const response = await fetch(`/api/location/reverse-geocode?lat=${lat}&lng=${lng}`);
          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || "Unable to resolve your area.");
          }

          const label = [data.location.area, data.location.city, data.location.state]
            .filter(Boolean)
            .join(", ");

          setNearby({
            loading: false,
            error: "",
            coords: { lat, lng },
            label
          });

          if (data.location.state) {
            setFilters((current) => ({ ...current, state: data.location.state }));
          }

          dismissLocationPrompt();
        } catch (locationError) {
          setNearby({
            loading: false,
            error: locationError.message,
            coords: null,
            label: ""
          });
        }
      },
      (geoError) => {
        setNearby({
          loading: false,
          error: getLocationErrorMessage(geoError),
          coords: null,
          label: ""
        });
        dismissLocationPrompt();
      },
      {
        enableHighAccuracy: false,
        timeout: 12000,
        maximumAge: 300000
      }
    );
  }

  /* const summaryChips = useMemo(
    () => [
      `${results.meta?.total || 0} stylists`,
      `${results.meta?.mappableCount || 0} public map pins`,
      nearby.label ? `Near you · ${nearby.label}` : "Highest rated first"
    ],
    [nearby.label, results.meta?.mappableCount, results.meta?.total]
  ); */

  return (
    <main className="section page-intro discover-page">
      <div className="container">
        {locationPromptVisible ? (
          <div className="discover-location-prompt">
            <div>
              <strong>Use your location for nearby stylists</strong>
              <p className="muted">
                We can suggest nearby stylists before sign-in and keep state browsing as the primary filter.
              </p>
            </div>
            <div className="hero-actions">
              <SiteButton type="button" size="sm" onClick={requestNearby} disabled={nearby.loading}>
                {nearby.loading ? "Checking..." : "Use my location"}
              </SiteButton>
              <SiteButton type="button" size="sm" variant="secondary" onClick={dismissLocationPrompt}>
                Not now
              </SiteButton>
            </div>
          </div>
        ) : null}

        <section className="discover-filter-shell surface">
          <div className="discover-filter-main">
            <label className="discover-filter-field">
              <span>Search service or stylist</span>
              <input
                value={filters.query}
                onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
                placeholder="Braids, silk press, fades, facials..."
              />
            </label>

            <label className="discover-filter-field">
              <span>State</span>
              <select
                value={filters.state}
                onChange={(event) => setFilters((current) => ({ ...current, state: event.target.value }))}
              >
                <option value="">All states</option>
                {US_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </label>

            <label className="discover-filter-field">
              <span>Sort</span>
              <select
                value={filters.sort}
                onChange={(event) => setFilters((current) => ({ ...current, sort: event.target.value }))}
              >
                {DISCOVER_SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="discover-filter-actions">
              <SiteButton type="button" size="sm" onClick={requestNearby} disabled={nearby.loading}>
                <LocateFixed size={16} />
                {nearby.loading ? "Finding..." : "Near me"}
              </SiteButton>
              <SiteButton type="button" size="sm" variant="secondary" onClick={() => setMobileMapOpen(true)}>
                <MapPinned size={16} />
                Map
              </SiteButton>
            </div>
          </div>

          <div className="discover-quick-filters">
            <div className="discover-quick-filter-heading">
              <Filter size={15} />
              <span>Quick filters</span>
            </div>

            <label className="discover-checkbox">
              <input
                type="checkbox"
                checked={filters.verifiedOnly}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, verifiedOnly: event.target.checked }))
                }
              />
              <span>Verified only</span>
            </label>

            <label className="discover-checkbox">
              <input
                type="checkbox"
                checked={filters.instantOnly}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, instantOnly: event.target.checked }))
                }
              />
              <span>Instant book</span>
            </label>

            <label className="discover-inline-select">
              <span>Price</span>
              <select
                value={filters.priceRange}
                onChange={(event) => setFilters((current) => ({ ...current, priceRange: event.target.value }))}
              >
                {DISCOVER_PRICE_OPTIONS.map((option) => (
                  <option key={option.value || "all"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {nearby.label ? (
              <button type="button" className="discover-nearby-pill" onClick={clearNearby}>
                <Sparkles size={14} />
                Near you: {nearby.label}
              </button>
            ) : null}
          </div>
        </section>

        {nearby.error ? <div className="discover-inline-error">{nearby.error}</div> : null}
        {error ? <div className="discover-inline-error">{error}</div> : null}

        <section className="discover-layout">
          <div className="discover-results-panel">
            {loading ? <div className="discover-status-card">Refreshing stylists…</div> : null}

            {!loading && !results.stylists.length ? (
              <div className="discover-empty-state">
                <strong>No stylists match these filters yet.</strong>
                <p className="muted">
                  Try widening the state or price filters, or remove the nearby context to see more options.
                </p>
                <SiteButton
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    setFilters({
                      query: "",
                      state: "",
                      sort: "highest_rated",
                      priceRange: "",
                      verifiedOnly: false,
                      instantOnly: false
                    })
                  }
                >
                  Reset filters
                </SiteButton>
              </div>
            ) : null}

            <div className="discover-results-list">
              {results.stylists.map((stylist) => (
                <StylistResultCard
                  key={stylist.slug}
                  stylist={stylist}
                  active={stylist.slug === activeSlug}
                  onActivate={setActiveSlug}
                />
              ))}
            </div>

            {results.meta?.hasMore ? (
              <div className="discover-load-more">
                <SiteButton type="button" onClick={loadMoreResults} disabled={loadingMore}>
                  {loadingMore ? "Loading..." : "Load more results"}
                </SiteButton>
              </div>
            ) : null}
          </div>

          <aside className="discover-map-panel">
            <div className="discover-map-panel-frame surface">
              <DiscoverMap
                stylists={results.stylists}
                activeSlug={activeSlug}
                onSelectStylist={setActiveSlug}
                userCoords={nearby.coords}
              />
              <ActiveMapPreview stylist={activeStylist} />
            </div>
          </aside>
        </section>
      </div>

      {mobileMapOpen ? (
        <div className="discover-mobile-map-backdrop" onClick={() => setMobileMapOpen(false)}>
          <div className="discover-mobile-map-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="discover-mobile-map-head">
              <div>
                <span className="eyebrow">Map</span>
                <h3>Nearby stylist pins</h3>
              </div>
              <button type="button" className="discover-mobile-map-close" onClick={() => setMobileMapOpen(false)}>
                Close
              </button>
            </div>
            <DiscoverMap
              stylists={results.stylists}
              activeSlug={activeSlug}
              onSelectStylist={setActiveSlug}
              userCoords={nearby.coords}
            />
            <ActiveMapPreview stylist={activeStylist} />
          </div>
        </div>
      ) : null}
    </main>
  );
}
