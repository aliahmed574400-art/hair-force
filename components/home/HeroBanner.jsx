"use client";

import { motion } from "framer-motion";
import { useRef } from "react";
import CursorCompanion from "@/components/animated/CursorCompanion";
import HeroParallax from "@/components/home/HeroParallax";
import HeroParticles from "@/components/home/HeroParticles";
import HeroSearch from "@/components/home/HeroSearch";

const EASE = [0.22, 1, 0.36, 1];

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12, delayChildren: 0.15 }
  }
};

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } }
};

const headlineWordVariants = {
  hidden: { opacity: 0, y: "100%" },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } }
};

function TrustStrip() {
  return (
    <motion.div
      variants={fadeUp}
      className="hero-trust-strip"
      aria-label="Trusted by clients across the country"
    >
      <div className="hero-trust-rating">
        <span className="hero-trust-stars" aria-hidden="true">★★★★★</span>
        <strong>4.9</strong>
        <span className="hero-trust-rating-meta">from 27,000+ reviews</span>
      </div>
      <span className="hero-trust-divider" aria-hidden="true" />
      <span className="hero-trust-pill">
        <span className="hero-trust-pill-dot" aria-hidden="true" />
        Same-day appointments available
      </span>
    </motion.div>
  );
}

function KineticHeadline() {
  const lineOne = ["Book", "your", "stylist", "in"];
  const accent = "60 seconds";

  return (
    <motion.h1
      className="hero-banner-headline"
      variants={fadeUp}
      transition={{ duration: 0 }}
    >
      <span className="hero-headline-line" aria-hidden="true">
        {lineOne.map((word, index) => (
          <span key={`w-${index}`} className="hero-headline-word-shell">
            <motion.span
              className="hero-headline-word"
              variants={headlineWordVariants}
            >
              {word}
            </motion.span>
          </span>
        ))}
      </span>
      <span className="hero-headline-line" aria-hidden="true">
        <span className="hero-headline-word-shell">
          <motion.span
            className="hero-headline-word hero-headline-accent"
            variants={headlineWordVariants}
          >
            {accent}
            <span className="hero-headline-shimmer" aria-hidden="true" />
          </motion.span>
        </span>
      </span>
      <span className="sr-only">Book your stylist in 60 seconds</span>
    </motion.h1>
  );
}

function OrbitTrails() {
  return (
    <svg className="hero-banner-trails" viewBox="0 0 1600 720" preserveAspectRatio="none" aria-hidden="true">
      <path d="M670 70C1020 60 1280 120 1540 30" />
      <path d="M560 250C840 208 1110 214 1520 118" />
      <path d="M620 430C920 360 1160 390 1580 290" />
      <path d="M520 590C860 500 1180 534 1600 474" />
      <path d="M950 42C1060 92 1158 136 1290 182" />
    </svg>
  );
}

export default function HeroBanner() {
  const heroRef = useRef(null);

  return (
    <div ref={heroRef} className="hero-banner-shell">
      <HeroParallax>
        <div className="hero-banner-panel">
          <HeroParticles />
          <div className="hero-banner-aurora hero-parallax-layer hero-parallax-layer-far" aria-hidden="true" />
          <div className="hero-banner-city hero-parallax-layer hero-parallax-layer-mid" aria-hidden="true" />
          <div className="hero-parallax-layer hero-parallax-layer-near">
            <OrbitTrails />
          </div>

          <motion.div
            className="hero-banner-copy"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            <TrustStrip />
            <KineticHeadline />

            <motion.p variants={fadeUp}>
              Discover top-rated salons, barbers, and beauty pros near you. Compare ratings,
              check live availability, and lock in your appointment in a single tap.
            </motion.p>

            <motion.div variants={fadeUp}>
              <HeroSearch />
            </motion.div>
          </motion.div>
        </div>
      </HeroParallax>
      <CursorCompanion scopeRef={heroRef} label="Search →" />
    </div>
  );
}
