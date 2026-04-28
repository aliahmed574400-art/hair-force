"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin } from "lucide-react";

let googleMapsPromise = null;

function loadGoogleMaps(apiKey) {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Maps can only load in the browser."));
  }

  if (window.google?.maps) {
    return Promise.resolve(window.google.maps);
  }

  if (!apiKey) {
    return Promise.reject(new Error("Google Maps is not configured."));
  }

  if (!googleMapsPromise) {
    googleMapsPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector("script[data-hairforce-google-maps='true']");

      if (existing) {
        existing.addEventListener("load", () => resolve(window.google.maps), { once: true });
        existing.addEventListener("error", () => reject(new Error("Unable to load Google Maps.")), {
          once: true
        });
        return;
      }

      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
      script.async = true;
      script.defer = true;
      script.dataset.hairforceGoogleMaps = "true";
      script.onload = () => resolve(window.google.maps);
      script.onerror = () => reject(new Error("Unable to load Google Maps."));
      document.head.appendChild(script);
    });
  }

  return googleMapsPromise;
}

function markerIcon(maps, active) {
  return {
    path: maps.SymbolPath.CIRCLE,
    fillColor: active ? "#173064" : "#60a5fa",
    fillOpacity: 1,
    strokeColor: "#ffffff",
    strokeWeight: active ? 3 : 2,
    scale: active ? 10 : 7
  };
}

export default function DiscoverMap({ stylists, activeSlug, onSelectStylist, userCoords }) {
  const mapNodeRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const [status, setStatus] = useState({
    loading: true,
    error: ""
  });
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const mappableStylists = useMemo(
    () =>
      (stylists || []).filter(
        (stylist) =>
          Number.isFinite(Number(stylist.latitude)) && Number.isFinite(Number(stylist.longitude))
      ),
    [stylists]
  );

  useEffect(() => {
    let cancelled = false;

    async function setupMap() {
      if (!mapNodeRef.current) {
        return;
      }

      if (!apiKey) {
        setStatus({ loading: false, error: "Google Maps key missing" });
        return;
      }

      if (!mappableStylists.length) {
        setStatus({ loading: false, error: "" });
        return;
      }

      setStatus({ loading: true, error: "" });

      try {
        const maps = await loadGoogleMaps(apiKey);

        if (cancelled || !mapNodeRef.current) {
          return;
        }

        if (!mapRef.current) {
          mapRef.current = new maps.Map(mapNodeRef.current, {
            center: { lat: Number(mappableStylists[0].latitude), lng: Number(mappableStylists[0].longitude) },
            zoom: 10,
            disableDefaultUI: true,
            zoomControl: true,
            styles: [
              {
                featureType: "administrative",
                elementType: "labels.text.fill",
                stylers: [{ color: "#4b5563" }]
              },
              {
                featureType: "landscape",
                elementType: "geometry",
                stylers: [{ color: "#eef4ff" }]
              },
              {
                featureType: "poi",
                stylers: [{ visibility: "off" }]
              },
              {
                featureType: "road",
                elementType: "geometry",
                stylers: [{ color: "#d8e5ff" }]
              },
              {
                featureType: "water",
                elementType: "geometry",
                stylers: [{ color: "#b8d9ff" }]
              }
            ]
          });
        }

        setStatus({ loading: false, error: "" });
      } catch (error) {
        if (!cancelled) {
          setStatus({ loading: false, error: error.message });
        }
      }
    }

    setupMap();

    return () => {
      cancelled = true;
    };
  }, [apiKey, mappableStylists]);

  useEffect(() => {
    if (!window.google?.maps || !mapRef.current) {
      return;
    }

    const maps = window.google.maps;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    let hasBounds = false;
    const bounds = new maps.LatLngBounds();

    if (userCoords?.lat && userCoords?.lng) {
      const userMarker = new maps.Marker({
        position: { lat: Number(userCoords.lat), lng: Number(userCoords.lng) },
        map: mapRef.current,
        icon: {
          path: maps.SymbolPath.CIRCLE,
          fillColor: "#2563eb",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 3,
          scale: 8
        },
        title: "Your location"
      });

      markersRef.current.push(userMarker);
      bounds.extend(userMarker.getPosition());
      hasBounds = true;
    }

    mappableStylists.forEach((stylist) => {
      const marker = new maps.Marker({
        position: {
          lat: Number(stylist.latitude),
          lng: Number(stylist.longitude)
        },
        map: mapRef.current,
        icon: markerIcon(maps, stylist.slug === activeSlug),
        title: stylist.name
      });

      marker.addListener("click", () => onSelectStylist?.(stylist.slug));
      bounds.extend(marker.getPosition());
      hasBounds = true;
      markersRef.current.push(marker);
    });

    if (!hasBounds) {
      return;
    }

    if (mappableStylists.length === 1 && !(userCoords?.lat && userCoords?.lng)) {
      mapRef.current.setCenter({
        lat: Number(mappableStylists[0].latitude),
        lng: Number(mappableStylists[0].longitude)
      });
      mapRef.current.setZoom(12);
      return;
    }

    mapRef.current.fitBounds(bounds, 72);
  }, [activeSlug, mappableStylists, onSelectStylist, userCoords]);

  if (!apiKey) {
    return (
      <div className="discover-map-fallback">
        <div className="discover-map-fallback-icon">
          <MapPin size={18} />
        </div>
        <strong>Interactive map unavailable</strong>
        <p className="muted" style={{ margin: 0 }}>
          Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to render live stylist pins here.
        </p>
      </div>
    );
  }

  if (!mappableStylists.length) {
    return (
      <div className="discover-map-fallback">
        <div className="discover-map-fallback-icon">
          <MapPin size={18} />
        </div>
        <strong>No public pins yet</strong>
        <p className="muted" style={{ margin: 0 }}>
          Stylists without saved coordinates still appear in the list and can update their map-safe area from the dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="discover-map-canvas">
      <div ref={mapNodeRef} className="discover-map-node" />
      {status.loading ? <div className="discover-map-overlay">Loading map…</div> : null}
      {status.error ? <div className="discover-map-overlay">{status.error}</div> : null}
    </div>
  );
}
