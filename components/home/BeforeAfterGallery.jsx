"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import Reveal from "@/components/animated/Reveal";

const TRANSFORMATIONS = [
  {
    id: "transformation-01",
    title: "Honey Balayage",
    stylist: "Cristan · Austin, TX",
    duration: "2.5 hrs",
    before: "/featured-stylists/fresha-01.jpg",
    after: "/featured-stylists/fresha-02.jpg"
  },
  {
    id: "transformation-02",
    title: "Sleek Bob Cut",
    stylist: "Eugenie Salon · Beverly Hills, CA",
    duration: "1.5 hrs",
    before: "/featured-stylists/fresha-03.jpg",
    after: "/featured-stylists/fresha-04.jpg"
  },
  {
    id: "transformation-03",
    title: "Beard Sculpt + Skin Fade",
    stylist: "GOAT Barber · Chicago, IL",
    duration: "1 hr",
    before: "/featured-stylists/fresha-07.jpg",
    after: "/featured-stylists/fresha-09.jpg"
  },
  {
    id: "transformation-04",
    title: "Glam Event Styling",
    stylist: "Top One Salon Spa · Naples, FL",
    duration: "2 hrs",
    before: "/featured-stylists/fresha-05.jpg",
    after: "/featured-stylists/fresha-06.jpg"
  }
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function ComparisonSlider({ transformation, isActive }) {
  const containerRef = useRef(null);
  const [position, setPosition] = useState(50);
  const dragStateRef = useRef({ active: false, pointerId: null });
  const sweepDoneRef = useRef(false);

  const updateFromClientX = useCallback((clientX) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const ratio = ((clientX - rect.left) / rect.width) * 100;
    setPosition(clamp(ratio, 4, 96));
  }, []);

  useEffect(() => {
    if (!isActive) {
      setPosition(50);
    }
  }, [isActive]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    if (sweepDoneRef.current) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !sweepDoneRef.current) {
            sweepDoneRef.current = true;
            const startTime = performance.now();
            const totalDuration = 2400;
            let frame = 0;
            const tick = (now) => {
              const elapsed = now - startTime;
              const t = Math.min(elapsed / totalDuration, 1);
              let value;
              if (t < 0.4) {
                const p = t / 0.4;
                value = 50 + (96 - 50) * (1 - Math.pow(1 - p, 3));
              } else if (t < 0.8) {
                const p = (t - 0.4) / 0.4;
                value = 96 - (96 - 4) * (1 - Math.pow(1 - p, 3));
              } else {
                const p = (t - 0.8) / 0.2;
                value = 4 + (50 - 4) * (1 - Math.pow(1 - p, 3));
              }
              setPosition(value);
              if (t < 1) {
                frame = requestAnimationFrame(tick);
              }
            };
            frame = requestAnimationFrame(tick);
            observer.disconnect();
            return;
          }
        }
      },
      { threshold: 0.4 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  function handlePointerDown(event) {
    const container = containerRef.current;
    if (!container) return;
    dragStateRef.current = { active: true, pointerId: event.pointerId };
    container.setPointerCapture?.(event.pointerId);
    updateFromClientX(event.clientX);
  }

  function handlePointerMove(event) {
    if (!dragStateRef.current.active) return;
    event.preventDefault();
    updateFromClientX(event.clientX);
  }

  function handlePointerUp(event) {
    const container = containerRef.current;
    if (dragStateRef.current.pointerId !== null) {
      container?.releasePointerCapture?.(dragStateRef.current.pointerId);
    }
    dragStateRef.current = { active: false, pointerId: null };
  }

  function handleKeyDown(event) {
    if (event.key === "ArrowLeft") {
      setPosition((current) => clamp(current - 4, 4, 96));
    } else if (event.key === "ArrowRight") {
      setPosition((current) => clamp(current + 4, 4, 96));
    } else if (event.key === "Home") {
      setPosition(4);
    } else if (event.key === "End") {
      setPosition(96);
    }
  }

  return (
    <div
      ref={containerRef}
      className="before-after-frame"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <div className="before-after-image before-after-image-before">
        <Image
          src={transformation.before}
          alt={`Before: ${transformation.title}`}
          fill
          sizes="(max-width: 760px) 100vw, 70vw"
          style={{ objectFit: "cover" }}
        />
        <span className="before-after-label before-after-label-before">Before</span>
      </div>
      <div
        className="before-after-image before-after-image-after"
        style={{ clipPath: `inset(0 0 0 ${position}%)` }}
      >
        <Image
          src={transformation.after}
          alt={`After: ${transformation.title}`}
          fill
          sizes="(max-width: 760px) 100vw, 70vw"
          style={{ objectFit: "cover" }}
        />
        <span className="before-after-label before-after-label-after">After</span>
      </div>
      <div
        className="before-after-divider"
        style={{ left: `${position}%` }}
        aria-hidden="true"
      />
      <button
        type="button"
        className="before-after-handle"
        style={{ left: `${position}%` }}
        role="slider"
        aria-label="Drag to compare before and after"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(position)}
        onKeyDown={handleKeyDown}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m9 6-6 6 6 6M15 6l6 6-6 6" />
        </svg>
      </button>
    </div>
  );
}

export default function BeforeAfterGallery() {
  const [activeIndex, setActiveIndex] = useState(0);
  const transformation = TRANSFORMATIONS[activeIndex];

  return (
    <div className="before-after-gallery">
      <Reveal as="div" className="before-after-heading">
        <span className="eyebrow">Real Transformations</span>
        <h2>Drag to see the difference</h2>
        <p>
          Browse a few real bookings from across the network. Drag the slider on each card
          to reveal the before and after — every result is verified by the stylist.
        </p>
      </Reveal>

      <div className="before-after-stage">
        <div className="before-after-stage-frame">
          <ComparisonSlider transformation={transformation} isActive={true} />
        </div>

        <div className="before-after-info">
          <span className="before-after-eyebrow">{transformation.duration} appointment</span>
          <h3>{transformation.title}</h3>
          <p>{transformation.stylist}</p>

          <div className="before-after-thumbs" role="tablist" aria-label="Choose a transformation">
            {TRANSFORMATIONS.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className={`before-after-thumb ${index === activeIndex ? "is-active" : ""}`}
                onClick={() => setActiveIndex(index)}
                aria-selected={index === activeIndex}
                role="tab"
              >
                <span className="before-after-thumb-image">
                  <Image
                    src={item.after}
                    alt=""
                    fill
                    sizes="80px"
                    style={{ objectFit: "cover" }}
                  />
                </span>
                <span className="before-after-thumb-label">{item.title}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
