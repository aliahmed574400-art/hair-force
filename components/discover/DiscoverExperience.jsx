"use client";

import Link from "next/link";
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronDown,
  Filter,
  Heart,
  LocateFixed,
  MapPinned,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  X
} from "lucide-react";
import DiscoverMap from "@/components/discover/DiscoverMap";
import SiteButton from "@/components/ui/SiteButton";
import {
  DISCOVER_PRICE_OPTIONS,
  DISCOVER_SORT_OPTIONS,
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
    return "Location permission was denied. You can still browse manually by city or state.";
  }
  if (error.code === 2) {
    return "Location is unavailable right now. Try again in a moment.";
  }
  return "Unable to fetch your location right now.";
}

function StylistResultCard({ stylist, active, onActivate }) {
  const [liked, setLiked] = useState(false);
  const mainService = stylist.topServices?.[0];
  const extraServices = (stylist.topServices || []).slice(1, 3);

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
          <div className="discover-card-title-block">
            <Link href={`/stylists/${stylist.slug}`} className="discover-card-name">
              {stylist.name}
            </Link>
            <p className="discover-card-salon">
              {stylist.category}
              {stylist.locationLabel || stylist.cityStateLabel
                ? ` · ${stylist.locationLabel || stylist.cityStateLabel}`
                : ""}
              {stylist.distanceLabel ? ` · ${stylist.distanceLabel}` : ""}
            </p>
          </div>
          <button
            type="button"
            className={`discover-card-heart ${liked ? "liked" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setLiked((v) => !v);
            }}
            aria-label="Save stylist"
          >
            <Heart size={18} fill={liked ? "currentColor" : "none"} />
          </button>
        </div>

        <div className="discover-card-rating-row">
          {stylist.rating >= 4.8 ? (
            <span className="discover-card-loved-badge">
              <Star size={12} fill="currentColor" />
              Loved by Clients
            </span>
          ) : null}
          <div className="discover-card-stars">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={14}
                fill={i < Math.round(stylist.rating || 0) ? "#f59e0b" : "none"}
                color={i < Math.round(stylist.rating || 0) ? "#f59e0b" : "#cbd5e1"}
              />
            ))}
            <span className="discover-card-rating-text">
              {Number(stylist.rating || 0).toFixed(1)}({formatReviewCount(stylist.reviewCount)})
            </span>
          </div>
        </div>

        <div className="discover-card-services">
          <Link href={`/stylists/${stylist.slug}`} className="discover-service-pill discover-service-pill--primary">
            See All Services
          </Link>
          {extraServices.map((service) => (
            <span key={service.id} className="discover-service-pill">
              {service.title}
              {service.duration ? ` · ${service.duration}` : ""}
              {service.price ? ` · $${service.price}` : ""}
            </span>
          ))}
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
  const [showFilters, setShowFilters] = useState(false);
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

  async function geocodeLocationInput(raw) {
    const address = raw.trim();
    if (!address) return;
    try {
      const response = await fetch(`/api/location/geocode?address=${encodeURIComponent(address)}`);
      const data = await response.json();
      if (response.ok && data.location?.state) {
        setFilters((current) => ({ ...current, state: data.location.state }));
        if (data.location.latitude && data.location.longitude) {
          setNearby({
            loading: false,
            error: "",
            coords: { lat: data.location.latitude, lng: data.location.longitude },
            label: data.location.formattedAddress || address
          });
        }
      }
    } catch {
      // silently fail — the text filter still works
    }
  }

  const sortLabel = DISCOVER_SORT_OPTIONS.find((o) => o.value === filters.sort)?.label || "Best Match";

  return (
    <main className="discover-page">
      {/* Top Search Bar */}
      <div className="discover-topbar">
        <div className="container">
          <div className="discover-search-row">
            <div className="discover-search-box">
              <Search size={18} className="discover-search-icon" />
              <input
                type="text"
                placeholder="Service, stylist or salon"
                value={filters.query}
                onChange={(e) => setFilters((c) => ({ ...c, query: e.target.value }))}
              />
            </div>
            <div className="discover-search-box">
              <MapPinned size={18} className="discover-search-icon" />
              <input
                type="text"
                placeholder="City, state, or zip"
                value={filters.state}
                onChange={(e) => setFilters((c) => ({ ...c, state: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") geocodeLocationInput(filters.state);
                }}
                onBlur={() => geocodeLocationInput(filters.state)}
              />
            </div>
            <button
              type="button"
              className="discover-search-btn"
              onClick={() => geocodeLocationInput(filters.state)}
            >
              Search
            </button>
          </div>

          <div className="discover-toolbar">
            <button
              type="button"
              className={`discover-toolbar-btn ${showFilters ? "active" : ""}`}
              onClick={() => setShowFilters((v) => !v)}
            >
              <Filter size={16} />
              Filters
            </button>
            <div className="discover-toolbar-sort">
              <span>Sort:</span>
              <button
                type="button"
                className="discover-sort-trigger"
                onClick={() => setShowFilters((v) => !v)}
              >
                {sortLabel}
                <ChevronDown size={14} />
              </button>
            </div>
            {nearby.label ? (
              <button type="button" className="discover-nearby-chip" onClick={clearNearby}>
                <Sparkles size={12} />
                Near you: {nearby.label}
                <X size={12} />
              </button>
            ) : null}
          </div>

          {showFilters ? (
            <div className="discover-filters-panel">
              <div className="discover-filters-grid">
                <label className="discover-filter-field">
                  <span>Sort by</span>
                  <select
                    value={filters.sort}
                    onChange={(e) => setFilters((c) => ({ ...c, sort: e.target.value }))}
                  >
                    {DISCOVER_SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="discover-filter-field">
                  <span>Price range</span>
                  <select
                    value={filters.priceRange}
                    onChange={(e) => setFilters((c) => ({ ...c, priceRange: e.target.value }))}
                  >
                    {DISCOVER_PRICE_OPTIONS.map((option) => (
                      <option key={option.value || "all"} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="discover-checkbox">
                  <input
                    type="checkbox"
                    checked={filters.verifiedOnly}
                    onChange={(e) => setFilters((c) => ({ ...c, verifiedOnly: e.target.checked }))}
                  />
                  <span>Verified only</span>
                </label>

                <label className="discover-checkbox">
                  <input
                    type="checkbox"
                    checked={filters.instantOnly}
                    onChange={(e) => setFilters((c) => ({ ...c, instantOnly: e.target.checked }))}
                  />
                  <span>Instant book</span>
                </label>
              </div>

              <div className="discover-filters-actions">
                <SiteButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setFilters({
                      query: "",
                      state: "",
                      sort: "highest_rated",
                      priceRange: "",
                      verifiedOnly: false,
                      instantOnly: false
                    });
                    clearNearby();
                  }}
                >
                  Reset
                </SiteButton>
                <SiteButton type="button" size="sm" onClick={() => setShowFilters(false)}>
                  Apply
                </SiteButton>
              </div>
            </div>
          ) : null}

          {nearby.error ? <div className="discover-inline-error">{nearby.error}</div> : null}
          {error ? <div className="discover-inline-error">{error}</div> : null}
        </div>
      </div>

      {/* Location Prompt */}
      {locationPromptVisible ? (
        <div className="container">
          <div className="discover-location-prompt">
            <div>
              <strong>Use your location for nearby stylists</strong>
              <p className="muted">
                We can suggest nearby stylists before sign-in and keep location browsing as the primary filter.
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
        </div>
      ) : null}

      {/* Results + Map */}
      <div className="container">
        <section className="discover-layout">
          <div className="discover-results-panel">
            {loading ? <div className="discover-status-card">Refreshing stylists…</div> : null}

            {!loading && !results.stylists.length ? (
              <div className="discover-empty-state">
                <strong>No stylists match these filters yet.</strong>
                <p className="muted">
                  Try widening the location or price filters, or remove the nearby context to see more options.
                </p>
                <SiteButton
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setFilters({
                      query: "",
                      state: "",
                      sort: "highest_rated",
                      priceRange: "",
                      verifiedOnly: false,
                      instantOnly: false
                    });
                    clearNearby();
                  }}
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
            <div className="discover-map-panel-frame">
              <DiscoverMap
                stylists={results.stylists}
                activeSlug={activeSlug}
                onSelectStylist={setActiveSlug}
                userCoords={nearby.coords}
              />
            </div>
          </aside>
        </section>
      </div>

      {/* Mobile Map */}
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
          </div>
        </div>
      ) : null}
    </main>
  );
}
