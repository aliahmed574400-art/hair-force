"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, X, Heart, Star } from "lucide-react";

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

function createRatingMarkerSvg(rating, active) {
  const display = Number(rating || 0).toFixed(1);
  const bg = active ? "#0f172a" : "#ffffff";
  const textColor = active ? "#ffffff" : "#0f172a";
  const stroke = active ? "#0f172a" : "#e2e8f0";
  const width = 44 + display.length * 7;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="32" viewBox="0 0 ${width} 32">
      <rect x="1" y="1" width="${width - 2}" height="30" rx="15" ry="15" fill="${bg}" stroke="${stroke}" stroke-width="1.5"/>
      <text x="${width / 2}" y="21" font-family="system-ui, sans-serif" font-size="13" font-weight="600" fill="${textColor}" text-anchor="middle">⭐ ${display}</text>
    </svg>
  `;
  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg.trim());
}

function createPinMarkerSvg(rating, active) {
  const display = Number(rating || 0).toFixed(1);
  const bg = active ? "#0f172a" : "#ffffff";
  const textColor = active ? "#ffffff" : "#0f172a";
  const stroke = active ? "#0f172a" : "#cbd5e1";
  const w = 52;
  const h = 36;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h + 8}" viewBox="0 0 ${w} ${h + 8}">
      <rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="14" ry="14" fill="${bg}" stroke="${stroke}" stroke-width="1.5"/>
      <text x="${w / 2}" y="23" font-family="system-ui, sans-serif" font-size="13" font-weight="600" fill="${textColor}" text-anchor="middle">★ ${display}</text>
      <polygon points="${w / 2 - 6},${h - 2} ${w / 2 + 6},${h - 2} ${w / 2},${h + 6}" fill="${bg}" stroke="${stroke}" stroke-width="1.5"/>
    </svg>
  `;
  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg.trim());
}

function buildInfoWindowContent(stylist) {
  const image = stylist.coverImage || stylist.avatar || "";
  const services = (stylist.topServices || []).slice(0, 3);
  const servicesText = services.length
    ? services.map((s) => s.title).join(" · ")
    : "View profile";

  return `
    <div style="font-family:system-ui,sans-serif;width:260px;padding:0;overflow:hidden;border-radius:16px;background:#fff;">
      ${image ? `<div style="width:100%;height:140px;background:url('${image}') center/cover no-repeat;position:relative;">
        <div style="position:absolute;top:8px;right:8px;display:flex;gap:6px;">
          <button style="width:28px;height:28px;border-radius:50%;border:none;background:rgba(0,0,0,0.5);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;" onclick="event.stopPropagation();">❤</button>
          <button style="width:28px;height:28px;border-radius:50%;border:none;background:rgba(0,0,0,0.5);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;" onclick="event.stopPropagation();window.parent.postMessage({type:'HAIRFORCE_CLOSE_INFO'},'*');">✕</button>
        </div>
      </div>` : ""}
      <div style="padding:14px;">
        <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:2px;">${stylist.name}</div>
        <div style="font-size:12px;color:#64748b;margin-bottom:6px;">${stylist.locationLabel || stylist.cityStateLabel || ""}</div>
        <div style="display:flex;align-items:center;gap:4px;margin-bottom:10px;">
          <span style="color:#f59e0b;font-size:14px;">★</span>
          <span style="font-size:13px;font-weight:600;color:#0f172a;">${Number(stylist.rating || 0).toFixed(1)}</span>
          <span style="font-size:12px;color:#94a3b8;">(${stylist.reviewCount || 0})</span>
        </div>
        <a href="/stylists/${stylist.slug}" target="_top" style="display:block;text-align:center;padding:10px 0;background:#0f5132;color:#fff;border-radius:10px;text-decoration:none;font-size:13px;font-weight:600;">See All Services</a>
      </div>
    </div>
  `;
}

export default function DiscoverMap({ stylists, activeSlug, onSelectStylist, userCoords }) {
  const mapNodeRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const infoWindowRef = useRef(null);
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
                stylers: [{ color: "#f8fafc" }]
              },
              {
                featureType: "poi",
                stylers: [{ visibility: "off" }]
              },
              {
                featureType: "road",
                elementType: "geometry",
                stylers: [{ color: "#ffffff" }]
              },
              {
                featureType: "road",
                elementType: "labels.text.fill",
                stylers: [{ color: "#64748b" }]
              },
              {
                featureType: "water",
                elementType: "geometry",
                stylers: [{ color: "#e0f2fe" }]
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

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    if (infoWindowRef.current) {
      infoWindowRef.current.close();
      infoWindowRef.current = null;
    }

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
      const isActive = stylist.slug === activeSlug;
      const marker = new maps.Marker({
        position: {
          lat: Number(stylist.latitude),
          lng: Number(stylist.longitude)
        },
        map: mapRef.current,
        icon: {
          url: createPinMarkerSvg(stylist.rating, isActive),
          scaledSize: new maps.Size(52, 44),
          anchor: new maps.Point(26, 40)
        },
        title: stylist.name
      });

      marker.addListener("click", () => {
        onSelectStylist?.(stylist.slug);

        if (infoWindowRef.current) {
          infoWindowRef.current.close();
        }

        infoWindowRef.current = new maps.InfoWindow({
          content: buildInfoWindowContent(stylist),
          pixelOffset: new maps.Size(0, -8),
          disableAutoPan: false
        });

        infoWindowRef.current.open(mapRef.current, marker);
      });

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
      mapRef.current.setZoom(13);
      return;
    }

    mapRef.current.fitBounds(bounds, { top: 60, right: 40, bottom: 60, left: 40 });
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
