"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CalendarDays, Check, Clock3, MapPin, Scissors, Search, Sparkles, Star } from "lucide-react";
import { motion, useMotionValueEvent, useScroll, useSpring, useTransform } from "framer-motion";

const ICONS = {
  search: Search,
  choose: Scissors,
  calendar: CalendarDays,
  sparkle: Sparkles
};

const STEP_ACCENTS = {
  search: "rgba(96, 165, 250, 0.7)",
  choose: "rgba(125, 211, 252, 0.7)",
  calendar: "rgba(147, 197, 253, 0.72)",
  sparkle: "rgba(186, 230, 253, 0.74)"
};

// Snap to integer card index based on scroll progress. The visual smoothness
// comes from useSpring (below), not from interpolating between integers here.
// Result: as user scrolls past a segment boundary, the target jumps from N to
// N+1 and the spring animates the cards from one to the next without ever
// showing two side-by-side at rest.
function getHeldCardProgress(progress, stepCount) {
  const maxIndex = Math.max(stepCount - 1, 0);
  const clampedProgress = Math.max(0, Math.min(1, progress));

  if (!maxIndex) {
    return 0;
  }

  const index = Math.floor(clampedProgress * stepCount);
  return Math.min(maxIndex, index);
}

function StepIcon({ name }) {
  const Icon = ICONS[name] || Search;
  return <Icon strokeWidth={1.9} aria-hidden="true" />;
}

function SearchSceneMap() {
  const pins = [
    { id: "a", x: 22, y: 32, accent: "#2856f8" },
    { id: "b", x: 44, y: 58, accent: "#c084fc" },
    { id: "c", x: 68, y: 30, accent: "#ff6b9d" },
    { id: "d", x: 80, y: 64, accent: "#54b6ff" },
    { id: "e", x: 32, y: 76, accent: "#6dffb0" }
  ];

  return (
    <div className="how-story-map-mock" aria-hidden="true">
      <svg viewBox="0 0 400 260" preserveAspectRatio="none" className="how-story-map-svg">
        <defs>
          <pattern id="howGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(40, 86, 248, 0.07)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="400" height="260" fill="url(#howGrid)" />
        <g stroke="rgba(40, 86, 248, 0.22)" strokeWidth="2" fill="none" strokeLinecap="round">
          <path d="M0 70 Q 100 60 200 90 T 400 110" />
          <path d="M0 160 Q 90 180 180 160 T 400 180" />
          <path d="M70 0 Q 90 90 110 200 T 130 260" />
          <path d="M260 0 Q 240 90 280 200 T 290 260" />
        </g>
        <g fill="rgba(40, 86, 248, 0.08)">
          <path d="M50 30 L 110 30 L 124 70 L 90 100 L 40 80 Z" />
          <path d="M230 20 L 290 50 L 296 100 L 240 116 L 220 70 Z" />
          <path d="M300 150 L 360 150 L 372 210 L 320 230 L 286 196 Z" />
          <path d="M120 180 L 180 174 L 196 230 L 144 246 L 110 222 Z" />
        </g>
      </svg>

      <div className="how-story-map-self">
        <span />
      </div>

      {pins.map((pin, index) => (
        <motion.span
          key={pin.id}
          className="how-story-map-pin"
          style={{ left: `${pin.x}%`, top: `${pin.y}%`, "--pin-accent": pin.accent }}
          animate={{ scale: [0.85, 1.1, 0.95] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: index * 0.18 }}
        >
          <span className="how-story-map-pin-dot" />
          <span className="how-story-map-pin-pulse" />
        </motion.span>
      ))}
    </div>
  );
}

function SearchScene({ active }) {
  return (
    <div className="how-story-scene how-story-scene-search">
      <div className="how-story-map-toolbar">
        <div className="how-story-map-searchbar">
          <Search strokeWidth={1.8} />
          <span>Hair near me</span>
        </div>

        <div className="how-story-map-filter">Open now</div>
      </div>

      <div className="how-story-map-canvas" aria-label="Stylist discovery map preview">
        <div className="how-story-map-live">
          <SearchSceneMap />
        </div>
        <div className="how-story-map-overlay" aria-hidden="true" />
      </div>

      <motion.div
        className="how-story-search-chip"
        animate={active ? { y: [0, -4, 0] } : { y: 0 }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      >
        <MapPin strokeWidth={1.8} />
        <span>5 salons nearby</span>
      </motion.div>
    </div>
  );
}

function ChooseScene({ active }) {
  const cards = [
    { title: "Studio Nova", meta: "4.9 rating", image: "/featured-stylists/fresha-02.jpg" },
    { title: "Muse Atelier", meta: "Luxury finish", image: "/app-preview/trendy-studio.webp" },
    { title: "Contour Collective", meta: "Top reviews", image: "/featured-stylists/fresha-09.jpg" }
  ];

  return (
    <div className="how-story-scene how-story-scene-choose">
      {cards.map((card, index) => (
        <motion.div
          key={card.title}
          className="how-story-mini-card"
          animate={
            active
              ? {
                x: [28 + index * 10, 0],
                y: [0, -8, 0],
                opacity: [0, 1],
                rotate: [index % 2 === 0 ? -2 : 2, 0]
              }
              : {
                x: index * 6,
                y: index * 6,
                opacity: 0.7,
                rotate: 0
              }
          }
          transition={{
            duration: 0.72,
            ease: [0.22, 1, 0.36, 1],
            delay: index * 0.08
          }}
          whileHover={{ y: -10, scale: 1.04, boxShadow: "0 28px 48px rgba(59, 130, 246, 0.18)" }}
        >
          <div className="how-story-mini-card-avatar">
            <img src={card.image} alt={`${card.title} preview`} />
          </div>
          <div>
            <strong>{card.title}</strong>
            <span>{card.meta}</span>
          </div>
          <div className="how-story-mini-card-stars" aria-hidden="true">
            <Star fill="currentColor" strokeWidth={1.6} />
            <Star fill="currentColor" strokeWidth={1.6} />
            <Star fill="currentColor" strokeWidth={1.6} />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function BookScene({ active }) {
  const days = ["12", "13", "14", "15", "16", "17", "18"];

  return (
    <div className="how-story-scene how-story-scene-book">
      <div className="how-story-calendar-panel">
        <div className="how-story-calendar-head">
          <span>April</span>
          <Clock3 strokeWidth={1.8} />
        </div>

        <div className="how-story-calendar-grid">
          {days.map((day, index) => {
            const isSelected = day === "16";
            return (
              <motion.div
                key={day}
                className={`how-story-calendar-day ${isSelected ? "is-selected" : ""}`}
                animate={
                  active && isSelected
                    ? {
                      scale: [1, 1.08, 1],
                      boxShadow: [
                        "0 0 0 rgba(96, 165, 250, 0)",
                        "0 0 26px rgba(96, 165, 250, 0.28)",
                        "0 0 0 rgba(96, 165, 250, 0)"
                      ]
                    }
                    : { scale: 1 }
                }
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: index * 0.06
                }}
              >
                {day}
              </motion.div>
            );
          })}
        </div>

        <motion.div
          className="how-story-calendar-confirm"
          animate={active ? { opacity: [0.62, 1, 0.74] } : { opacity: 0.72 }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <Check strokeWidth={1.9} />
          <span>Selected 4:30 PM</span>
        </motion.div>
      </div>
    </div>
  );
}

function StyledScene({ active }) {
  return (
    <div className="how-story-scene how-story-scene-styled">
      <motion.div
        className="how-story-style-photo-frame"
        animate={active ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0.94, y: 4, scale: 0.985 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="how-story-style-photo-shell">
          <Image
            src="/how-it-works/get-styled-transform.jpeg"
            alt="Before and after hair transformation"
            fill
            sizes="(max-width: 900px) 70vw, 360px"
            className="how-story-style-photo-image"
            priority={false}
          />
        </div>

        <motion.div
          className="how-story-style-rating"
          animate={active ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 14, scale: 0.92 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="how-story-style-rating-stars" aria-hidden="true">
            <Star fill="currentColor" strokeWidth={0} />
            <Star fill="currentColor" strokeWidth={0} />
            <Star fill="currentColor" strokeWidth={0} />
            <Star fill="currentColor" strokeWidth={0} />
            <Star fill="currentColor" strokeWidth={0} />
          </span>
          <strong>5.0</strong>
          <span className="how-story-style-rating-meta">Rebooked</span>
        </motion.div>

        <motion.div
          className="how-story-style-rebook"
          animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.5, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <Sparkles strokeWidth={1.8} />
          <span>Tap to rebook in 2 weeks</span>
        </motion.div>
      </motion.div>
    </div>
  );
}

function StepScene({ icon, active }) {
  if (icon === "search") {
    return <SearchScene active={active} />;
  }

  if (icon === "choose") {
    return <ChooseScene active={active} />;
  }

  if (icon === "calendar") {
    return <BookScene active={active} />;
  }

  return <StyledScene active={active} />;
}

function DesktopCard({ step, isActive, cardWidth }) {
  const resolvedWidth = typeof cardWidth === "number" && cardWidth > 0 ? `${cardWidth}px` : "min(78vw, 860px)";

  return (
    <motion.article
      className={`how-story-card ${isActive ? "is-active" : ""}`}
      style={{
        width: resolvedWidth,
        "--how-story-accent": STEP_ACCENTS[step.icon] ?? "rgba(96, 165, 250, 0.7)"
      }}
      animate={{
        opacity: isActive ? 1 : 0.68,
        scale: isActive ? 1 : 0.96,
        filter: isActive ? "blur(0px)" : "blur(1.4px)"
      }}
      transition={{
        opacity: { duration: 0.26, ease: "easeOut" },
        scale: { type: "spring", stiffness: 220, damping: 24 },
        filter: { duration: 0.26, ease: "easeOut" }
      }}
      whileHover={isActive ? { scale: 1.03, y: -8 } : undefined}
    >
      <div className="how-story-card-copy">
        <div className="how-story-card-head">
          <span className="how-story-card-step">Step {step.step}</span>
          <motion.div
            className="how-story-card-icon"
            whileHover={{ rotate: step.icon === "choose" ? -8 : 8, scale: 1.06 }}
            transition={{ type: "spring", stiffness: 260, damping: 16 }}
          >
            <motion.span
              animate={
                isActive
                  ? {
                    y: step.icon === "search" ? [0, -4, 0] : [0, -3, 0],
                    rotate: step.icon === "sparkle" ? [0, 10, -10, 0] : [0, 3, -3, 0],
                    scale: [1, 1.04, 1]
                  }
                  : { y: 0, rotate: 0, scale: 1 }
              }
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            >
              <StepIcon name={step.icon} />
            </motion.span>
          </motion.div>
        </div>

        <h3>{step.title}</h3>
      </div>

      <div className="how-story-card-visual">
        <StepScene icon={step.icon} active={isActive} />
      </div>
    </motion.article>
  );
}

function MobileCard({ step, index }) {
  return (
    <motion.article
      className="how-story-mobile-card"
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.55, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      style={{ "--how-story-accent": STEP_ACCENTS[step.icon] ?? "rgba(96, 165, 250, 0.7)" }}
    >
      <div className="how-story-mobile-head">
        <span className="how-story-card-step">Step {step.step}</span>
        <div className="how-story-card-icon">
          <StepIcon name={step.icon} />
        </div>
      </div>

      <div className="how-story-mobile-copy">
        <h3>{step.title}</h3>
      </div>

      <div className="how-story-mobile-scene">
        <StepScene icon={step.icon} active />
      </div>
    </motion.article>
  );
}

export default function HowItWorksTimeline({ steps }) {
  const shellRef = useRef(null);
  const scrollRef = useRef(null);
  const stageViewportRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [stageWidth, setStageWidth] = useState(0);
  const stepCount = Math.max(steps.length, 1);
  // Total scroll-trap height = stepCount segments. The old code added a "+1"
  // buffer segment so the last card could fully animate in before release —
  // unnecessary now that the spring animates the transition. Without this,
  // the section released ~18vh AFTER the last card was already visible,
  // making the page feel stuck.
  const scrollStepCount = stepCount;
  const { scrollYProgress } = useScroll({
    target: scrollRef,
    offset: ["start start", "end end"]
  });

  // Raw integer index from scroll; cardProgress is the spring-animated version
  // that drives all transforms. Spring config tuned so transitions take ~400ms
  // and don't oscillate.
  const rawCardProgress = useTransform(scrollYProgress, (latest) => getHeldCardProgress(latest, stepCount));
  const cardProgress = useSpring(rawCardProgress, {
    stiffness: 180,
    damping: 30,
    mass: 0.9
  });

  useEffect(() => {
    const node = stageViewportRef.current;
    if (!node) {
      return undefined;
    }

    const updateStageWidth = () => {
      setStageWidth(node.clientWidth || 0);
    };

    updateStageWidth();

    const observer = new ResizeObserver(() => {
      updateStageWidth();
    });

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  useMotionValueEvent(cardProgress, "change", (latest) => {
    const nextIndex = Math.max(0, Math.min(stepCount - 1, Math.round(latest)));
    setActiveIndex((previousIndex) => (previousIndex === nextIndex ? previousIndex : nextIndex));
  });

  // Card stretches to fill the stage — no centered padding, no neighbor
  // bleed, no parallax backplates behind it. Each track step shifts by one
  // full stage width so card N replaces card N-1 cleanly.
  const cardWidth = stageWidth;
  const trackGap = 0;
  const trackPadding = 0;
  const trackStepWidth = stageWidth || 0;
  const trackX = useTransform(cardProgress, (v) => -v * trackStepWidth);

  const handleMouseMove = (event) => {
    const shell = shellRef.current;

    if (!shell) {
      return;
    }

    const rect = shell.getBoundingClientRect();
    shell.style.setProperty("--how-story-mx", `${event.clientX - rect.left}px`);
    shell.style.setProperty("--how-story-my", `${event.clientY - rect.top}px`);
  };

  const handleMouseLeave = () => {
    const shell = shellRef.current;

    if (!shell) {
      return;
    }

    shell.style.setProperty("--how-story-mx", "50%");
    shell.style.setProperty("--how-story-my", "42%");
  };

  return (
    <div
      ref={scrollRef}
      className="how-story-shell"
      style={{ "--how-story-step-count": scrollStepCount }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div ref={shellRef} className="how-story-sticky">
        <div className="how-story-copy">
          <div className="how-story-copy-panel">
            <div className="how-story-copy-header">
              <span className="eyebrow how-story-eyebrow">How It Works</span>
              <span className="how-story-copy-count">
                {String(activeIndex + 1).padStart(2, "0")} / {String(stepCount).padStart(2, "0")}
              </span>
            </div>

            <h2>How Hair Force Works</h2>
            <p>Book your perfect style in 4 simple steps — no calls, no waiting.</p>

            <div className="how-story-progress">
              <div className="how-story-progress-rail" aria-hidden="true">
                <span className="how-story-progress-base" />
                <motion.span className="how-story-progress-fill" style={{ scaleY: scrollYProgress }} />
              </div>

              <div className="how-story-progress-list">
                {steps.map((step, index) => (
                  <div
                    key={`progress-${step.step}`}
                    className={`how-story-progress-item ${index === activeIndex ? "is-active" : index < activeIndex ? "is-complete" : ""
                      }`}
                  >
                    <span className="how-story-progress-number">{step.step}</span>
                    <div>
                      <strong>{step.title}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Link href="/discover" className="how-story-cta">
              Find your stylist now
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          </div>
        </div>

        <div
          className="how-story-stage"
          style={{
            "--how-story-active-accent": STEP_ACCENTS[steps[activeIndex]?.icon] ?? "rgba(96, 165, 250, 0.7)"
          }}
        >
          <div ref={stageViewportRef} className="how-story-card-stack">
            <motion.span
              className="how-story-stage-glow"
              aria-hidden="true"
              animate={{
                opacity: 0.85,
                scale: [0.98, 1.04, 0.98]
              }}
              transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
            />

            <motion.div
              className="how-story-card-track"
              style={{
                x: trackX,
                gap: `${trackGap}px`,
                paddingInline: `${trackPadding}px`
              }}
            >
              {steps.map((step, index) => (
                <DesktopCard
                  key={step.step}
                  step={step}
                  isActive={index === activeIndex}
                  cardWidth={cardWidth}
                />
              ))}
            </motion.div>
          </div>
        </div>
      </div>

      <div className="how-story-mobile">
        <span className="eyebrow how-story-eyebrow">How It Works</span>
        <h2>How Hair Force Works</h2>
        <p>Book your perfect style in 4 simple steps</p>

        <div className="how-story-mobile-list">
          {steps.map((step, index) => (
            <MobileCard key={`mobile-${step.step}`} step={step} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
}
