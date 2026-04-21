"use client";

import Image from "next/image";
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

function StepIcon({ name }) {
  const Icon = ICONS[name] || Search;
  return <Icon strokeWidth={1.9} aria-hidden="true" />;
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

      <div className="how-story-map-canvas" aria-label="Interactive stylist discovery map">
        <div className="how-story-map-live">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d50485.652103384586!2d-122.51686092481643!3d37.734855997932215!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x808f7e1b5370cb91%3A0xedb84052fc4cfd91!2sLouie&#39;s%20Barbershop%20SF!5e0!3m2!1sen!2s!4v1776714285088!5m2!1sen!2s"
            title="Louie's Barbershop San Francisco map"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
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

function getCardMotion(index, progressValue) {
  const focusIndex = Math.round(progressValue);
  const stackDistance = index - focusIndex;
  const travelDistance = index - progressValue;
  const absStackDistance = Math.abs(stackDistance);
  const absTravelDistance = Math.abs(travelDistance);

  if (stackDistance === 0) {
    return {
      opacity: 1,
      scale: 1 - Math.min(absTravelDistance * 0.018, 0.018),
      x: travelDistance * 26,
      y: Math.min(absTravelDistance * 8, 8),
      rotateZ: travelDistance * -0.9,
      filter: "blur(0px)",
      clipPath: "inset(0% 0% 0% 0% round 34px)",
      zIndex: 30,
      boxShadow:
        "0 34px 84px rgba(108, 136, 190, 0.2), 0 0 32px rgba(96, 165, 250, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.56)"
    };
  }

  if (absStackDistance === 1) {
    const isAhead = stackDistance > 0;

    return {
      opacity: isAhead ? 0.18 : 0.1,
      scale: isAhead ? 0.92 : 0.88,
      x: isAhead ? 156 + travelDistance * 18 : -182 + travelDistance * 14,
      y: isAhead ? 22 : 34,
      rotateZ: isAhead ? 2.2 : -3.2,
      filter: `blur(${isAhead ? 7 : 10}px)`,
      clipPath: isAhead
        ? "inset(8% 0% 8% 50% round 30px)"
        : "inset(8% 58% 8% 0% round 30px)",
      zIndex: isAhead ? 11 : 8,
      boxShadow: "0 18px 42px rgba(108, 136, 190, 0.08)"
    };
  }

  return {
    opacity: 0.03,
    scale: 0.82,
    x: stackDistance > 0 ? 256 + absStackDistance * 22 : -268 - absStackDistance * 24,
    y: 48 + absStackDistance * 10,
    rotateZ: stackDistance > 0 ? 4.5 : -5,
    filter: "blur(16px)",
    clipPath:
      stackDistance > 0
        ? "inset(12% 0% 12% 76% round 28px)"
        : "inset(12% 76% 12% 0% round 28px)",
    zIndex: 2,
    boxShadow: "0 10px 24px rgba(108, 136, 190, 0.04)"
  };
}

function DesktopCard({ step, index, activeIndex, rawCardProgress }) {
  const isActive = Math.abs(index - activeIndex) < 0.5;

  const opacity = useTransform(rawCardProgress, (v) => getCardMotion(index, v).opacity);
  const scale = useTransform(rawCardProgress, (v) => getCardMotion(index, v).scale);
  const x = useTransform(rawCardProgress, (v) => getCardMotion(index, v).x);
  const y = useTransform(rawCardProgress, (v) => getCardMotion(index, v).y);
  const rotateZ = useTransform(rawCardProgress, (v) => getCardMotion(index, v).rotateZ);
  const filter = useTransform(rawCardProgress, (v) => getCardMotion(index, v).filter);
  const clipPath = useTransform(rawCardProgress, (v) => getCardMotion(index, v).clipPath);
  const zIndex = useTransform(rawCardProgress, (v) => getCardMotion(index, v).zIndex);
  const boxShadow = useTransform(rawCardProgress, (v) => getCardMotion(index, v).boxShadow);

  return (
    <motion.article
      className={`how-story-card ${isActive ? "is-active" : ""}`}
      style={{
        zIndex,
        opacity,
        scale,
        x,
        y,
        rotateZ,
        filter,
        clipPath,
        boxShadow,
        pointerEvents: isActive ? "auto" : "none",
        "--how-story-accent": STEP_ACCENTS[step.icon] ?? "rgba(96, 165, 250, 0.7)"
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
        <p>{step.text}</p>
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
        <p>{step.text}</p>
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
  const [activeIndex, setActiveIndex] = useState(0);
  const stepCount = Math.max(steps.length, 1);
  const { scrollYProgress } = useScroll({
    target: scrollRef,
    offset: ["start start", "end end"]
  });
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 24,
    mass: 0.34
  });

  const rawCardProgress = useTransform(smoothProgress, (latest) => latest * Math.max(stepCount - 1, 0));

  useMotionValueEvent(rawCardProgress, "change", (latest) => {
    const nextIndex = Math.max(0, Math.min(stepCount - 1, Math.round(latest)));
    if (nextIndex !== activeIndex) {
      setActiveIndex(nextIndex);
    }
  });

  const backX = useTransform(rawCardProgress, (v) => -22 + v * 6);
  const backY = useTransform(rawCardProgress, (v) => -20 + v * 5);
  const backRot = useTransform(rawCardProgress, (v) => -6 + v * 0.8);

  const frontX = useTransform(rawCardProgress, (v) => 18 - v * 5);
  const frontY = useTransform(rawCardProgress, (v) => 22 - v * 4);
  const frontRot = useTransform(rawCardProgress, (v) => 5 - v * 0.7);

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
      style={{ "--how-story-step-count": stepCount }}
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
            <p>Book your perfect style in 4 simple steps</p>

            <div className="how-story-progress">
              <div className="how-story-progress-rail" aria-hidden="true">
                <span className="how-story-progress-base" />
                <motion.span className="how-story-progress-fill" style={{ scaleY: smoothProgress }} />
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
                      <span>{step.text}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div
          className="how-story-stage"
          style={{
            "--how-story-active-accent": STEP_ACCENTS[steps[activeIndex]?.icon] ?? "rgba(96, 165, 250, 0.7)"
          }}
        >
          <div className="how-story-card-stack">
            <motion.span
              className="how-story-stage-backplate is-back"
              aria-hidden="true"
              style={{
                x: backX,
                y: backY,
                rotate: backRot
              }}
            />
            <motion.span
              className="how-story-stage-backplate is-front"
              aria-hidden="true"
              style={{
                x: frontX,
                y: frontY,
                rotate: frontRot
              }}
            />

            <motion.span
              className="how-story-stage-glow"
              aria-hidden="true"
              animate={{
                opacity: 0.85,
                scale: [0.98, 1.04, 0.98]
              }}
              transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
            />
            {steps.map((step, index) => (
              <DesktopCard key={step.step} step={step} index={index} activeIndex={activeIndex} rawCardProgress={rawCardProgress} />
            ))}
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
