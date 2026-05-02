"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import CountUp from "@/components/animated/CountUp";
import Reveal from "@/components/animated/Reveal";

const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => <div className="nearby-map-loading" aria-hidden="true" />
});

const NEARBY_PINS = [
  {
    id: "p1",
    slug: "cristan",
    name: "Cristan",
    category: "Hair Salon",
    priceFrom: 65,
    rating: 5.0,
    distance: "0.4 mi",
    lat: 30.2672,
    lng: -97.7431,
    accent: "#2856f8"
  },
  {
    id: "p2",
    slug: "ace-hair-and-nail-salon",
    name: "Ace Hair & Nail",
    category: "Beauty Salon",
    priceFrom: 45,
    rating: 4.8,
    distance: "0.8 mi",
    lat: 40.6782,
    lng: -73.9442,
    accent: "#c084fc"
  },
  {
    id: "p3",
    slug: "eugenie-salon",
    name: "Eugenie Salon",
    category: "Beauty Salon",
    priceFrom: 95,
    rating: 4.8,
    distance: "1.2 mi",
    lat: 34.0736,
    lng: -118.4004,
    accent: "#ff6b9d"
  },
  {
    id: "p4",
    slug: "yin-salon-and-spa",
    name: "Yin Salon & Spa",
    category: "Hair Salon",
    priceFrom: 80,
    rating: 4.9,
    distance: "1.5 mi",
    lat: 33.4942,
    lng: -111.9261,
    accent: "#54b6ff"
  },
  {
    id: "p5",
    slug: "top-one-salon-spa",
    name: "Top One Salon Spa",
    category: "Spa",
    priceFrom: 110,
    rating: 4.9,
    distance: "1.9 mi",
    lat: 26.142,
    lng: -81.7948,
    accent: "#6dffb0"
  },
  {
    id: "p6",
    slug: "goat-barber",
    name: "GOAT Barber",
    category: "Barbershop",
    priceFrom: 35,
    rating: 4.9,
    distance: "2.1 mi",
    lat: 41.8781,
    lng: -87.6298,
    accent: "#2856f8"
  },
  {
    id: "p7",
    slug: "alchemic-beauty-studio",
    name: "Alchemic Beauty",
    category: "Beauty Studio",
    priceFrom: 70,
    rating: 4.8,
    distance: "2.4 mi",
    lat: 34.0522,
    lng: -118.2437,
    accent: "#c084fc"
  },
  {
    id: "p8",
    slug: "the-lair-man",
    name: "The Lair Man",
    category: "Barbershop",
    priceFrom: 40,
    rating: 4.9,
    distance: "2.7 mi",
    lat: 36.1627,
    lng: -86.7816,
    accent: "#ff6b9d"
  }
];

export default function NearbyStylistsMap() {
  const [activePinId, setActivePinId] = useState(NEARBY_PINS[0].id);
  const [revealed, setRevealed] = useState(false);
  const containerRef = useRef(null);
  const activePin = NEARBY_PINS.find((pin) => pin.id === activePinId) || NEARBY_PINS[0];
  const activeDistanceValue = parseFloat(activePin.distance) || 0;

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRevealed(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setRevealed(true);
            observer.disconnect();
            return;
          }
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="nearby-map-shell">
      <div className="nearby-map-header">
        <Reveal as="span" className="eyebrow" y={16}>
          Stylists Near You
        </Reveal>
        <Reveal as="h2" delay={0.05}>
          Discover real salons across the country
        </Reveal>
        <Reveal as="p" delay={0.12} y={20}>
          Tap a pin to preview a stylist. Connect your location for live availability,
          travel time, and same-day openings near where you live or work.
        </Reveal>
      </div>

      <div className="nearby-map-grid">
        <div ref={containerRef} className="nearby-map-canvas" role="region" aria-label="Stylists nearby map preview">
          <LeafletMap
            pins={NEARBY_PINS}
            activePinId={activePinId}
            onPinSelect={setActivePinId}
          />

          <motion.div
            className="nearby-map-legend"
            aria-hidden="true"
            initial={{ opacity: 0, y: 12 }}
            animate={revealed ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
            transition={{ duration: 0.5, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="nearby-map-legend-dot" /> Available today
          </motion.div>
        </div>

        <aside className="nearby-map-side" aria-live="polite">
          <motion.div
            key={activePin.id}
            className="nearby-map-side-card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="nearby-map-side-meta">
              <span className="nearby-map-side-distance">
                <CountUp end={activeDistanceValue} decimals={1} duration={900} suffix=" mi away" />
              </span>
              <span className="nearby-map-side-rating">
                ★ <CountUp end={activePin.rating} decimals={1} duration={900} />
              </span>
            </div>
            <h3>{activePin.name}</h3>
            <p>{activePin.category}</p>
            <div className="nearby-map-side-price">
              From $<CountUp end={activePin.priceFrom} duration={900} />
            </div>
            <Link href={`/stylists/${activePin.slug}`} className="nearby-map-side-cta" data-cursor-target="true">
              View profile
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          </motion.div>

          <Link href="/discover" className="nearby-map-fullmap">
            See all stylists on the full map
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        </aside>
      </div>
    </div>
  );
}
