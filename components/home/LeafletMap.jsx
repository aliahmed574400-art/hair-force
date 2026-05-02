"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";

function buildPinIcon({ accent, isActive }) {
  const ringSize = isActive ? 26 : 20;
  const dotSize = isActive ? 14 : 10;
  return L.divIcon({
    className: "leaflet-stylist-marker",
    iconSize: [ringSize, ringSize],
    iconAnchor: [ringSize / 2, ringSize / 2],
    html: `
      <span class="leaflet-stylist-marker-inner ${isActive ? "is-active" : ""}" style="--pin-accent:${accent};width:${ringSize}px;height:${ringSize}px;">
        <span class="leaflet-stylist-marker-dot" style="width:${dotSize}px;height:${dotSize}px;"></span>
        ${isActive ? '<span class="leaflet-stylist-marker-pulse"></span>' : ""}
      </span>
    `
  });
}

function buildSelfIcon() {
  return L.divIcon({
    className: "leaflet-self-marker",
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    html: `
      <span class="leaflet-self-marker-inner">
        <span class="leaflet-self-marker-pulse"></span>
      </span>
    `
  });
}

function FitBoundsToPins({ pins, selfPosition }) {
  const map = useMap();

  useEffect(() => {
    if (!pins || pins.length === 0) return;
    const allPoints = [
      ...pins.map((pin) => [pin.lat, pin.lng]),
      ...(selfPosition ? [selfPosition] : [])
    ];
    const bounds = L.latLngBounds(allPoints);
    map.fitBounds(bounds, { padding: [50, 50], animate: false });
  }, [map, pins, selfPosition]);

  return null;
}

export default function LeafletMap({ pins, activePinId, onPinSelect, selfPosition }) {
  return (
    <MapContainer
      className="leaflet-stylist-map"
      center={[39.5, -98.35]}
      zoom={4}
      scrollWheelZoom={false}
      zoomControl={false}
      attributionControl={true}
      style={{ width: "100%", height: "100%" }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains={["a", "b", "c", "d"]}
        maxZoom={19}
      />

      {selfPosition ? (
        <Marker position={selfPosition} icon={buildSelfIcon()} interactive={false} />
      ) : null}

      {pins.map((pin) => (
        <Marker
          key={pin.id}
          position={[pin.lat, pin.lng]}
          icon={buildPinIcon({ accent: pin.accent, isActive: pin.id === activePinId })}
          eventHandlers={{
            click: () => onPinSelect?.(pin.id),
            mouseover: () => onPinSelect?.(pin.id)
          }}
        />
      ))}

      <FitBoundsToPins pins={pins} selfPosition={selfPosition} />
    </MapContainer>
  );
}
