"use client";

import { useEffect, useRef, useState } from "react";
import MagneticWrap from "@/components/animated/MagneticWrap";

const SERVICES = [
  "Haircut",
  "Beard",
  "Coloring",
  "Styling",
  "Facial",
  "Nails",
  "Braids & Locs",
  "Makeup",
  "Massage",
  "Skin Care"
];

const PLACEHOLDER_PHRASES = [
  "balayage in Brooklyn",
  "fade cut in Chicago",
  "bridal hair in Beverly Hills",
  "facial in Austin",
  "beard sculpt in Nashville",
  "glam styling in Naples"
];

const TYPE_DELAY = 70;
const DELETE_DELAY = 40;
const HOLD_DELAY = 1600;

function useTypewriter(phrases, isActive) {
  const [text, setText] = useState("");

  useEffect(() => {
    if (!isActive) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    let phraseIndex = 0;
    let charIndex = 0;
    let mode = "typing";
    let timer = null;

    const tick = () => {
      const phrase = phrases[phraseIndex];

      if (mode === "typing") {
        charIndex += 1;
        setText(phrase.slice(0, charIndex));
        if (charIndex === phrase.length) {
          mode = "holding";
          timer = setTimeout(tick, HOLD_DELAY);
          return;
        }
        timer = setTimeout(tick, TYPE_DELAY);
      } else if (mode === "holding") {
        mode = "deleting";
        timer = setTimeout(tick, DELETE_DELAY);
      } else if (mode === "deleting") {
        charIndex -= 1;
        setText(phrase.slice(0, Math.max(charIndex, 0)));
        if (charIndex <= 0) {
          phraseIndex = (phraseIndex + 1) % phrases.length;
          mode = "typing";
          timer = setTimeout(tick, 280);
          return;
        }
        timer = setTimeout(tick, DELETE_DELAY);
      }
    };

    timer = setTimeout(tick, 600);

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [phrases, isActive]);

  return text;
}

export default function HeroSearch() {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [focused, setFocused] = useState(false);
  const queryRef = useRef(null);

  const typingActive = !focused && query.length === 0;
  const typed = useTypewriter(PLACEHOLDER_PHRASES, typingActive);
  const placeholder = typingActive ? `Try “${typed}|”` : "Service, salon, or stylist";

  return (
    <form className="hero-search" action="/discover">
      <div className="hero-search-row">
        <label className="hero-search-field">
          <span className="hero-search-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="11" cy="11" r="6.5" />
              <path d="m16 16 4.2 4.2" />
            </svg>
          </span>
          <input
            ref={queryRef}
            type="text"
            name="query"
            list="hero-search-services"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={placeholder}
            autoComplete="off"
          />
          <datalist id="hero-search-services">
            {SERVICES.map((service) => (
              <option key={service} value={service} />
            ))}
          </datalist>
        </label>

        <span className="hero-search-divider" aria-hidden="true" />

        <label className="hero-search-field">
          <span className="hero-search-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 21s7-6.4 7-12a7 7 0 1 0-14 0c0 5.6 7 12 7 12Z" />
              <circle cx="12" cy="9" r="2.6" />
            </svg>
          </span>
          <input
            type="text"
            name="city"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="City or zip"
            autoComplete="off"
          />
        </label>

        <span className="hero-search-divider" aria-hidden="true" />

        <label className="hero-search-field hero-search-field-date">
          <span className="hero-search-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <rect x="3.5" y="5.5" width="17" height="15" rx="3" />
              <path d="M7.5 3.8v3.4M16.5 3.8v3.4M3.8 9.5h16.4" />
            </svg>
          </span>
          <input
            type="date"
            name="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>

        <MagneticWrap strength={0.35} radius={120}>
          <button
            type="submit"
            className="hero-search-submit"
            data-cursor-target="true"
          >
            <span>Search</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </MagneticWrap>
      </div>
    </form>
  );
}
