"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Reveal from "@/components/animated/Reveal";
import RevealText from "@/components/animated/RevealText";

const GAP = 24;
const TESTIMONIAL_IMAGES = {
  "Emma Collins": "/featured-stylists/fresha-01.jpg",
  "Olivia Reed": "/featured-stylists/fresha-05.jpg",
  "Ava Thompson": "/app-preview/trendy-studio.webp"
};

function getCardsPerView(width) {
  if (width <= 760) return 1;
  if (width <= 1180) return 2;
  return 3;
}

function TestimonialCard({ testimonial, index }) {
  const isSpotlight = testimonial.variant === "spotlight";
  const avatarSrc = testimonial.image || TESTIMONIAL_IMAGES[testimonial.name] || "/app-preview/trendy-studio.webp";

  return (
    <Reveal
      className={`testimonial-card testimonial-card-shell ${isSpotlight ? "testimonial-card-spotlight" : "testimonial-card-quote"} testimonial-card-accent-${testimonial.accent ?? "blue"}`}
      delay={index * 0.05}
      y={30}
    >
      {isSpotlight ? (
        <>
          <div className="testimonial-spotlight-media">
            <div className="testimonial-spotlight-badge">Featured voice</div>
            <div className="testimonial-spotlight-play" aria-hidden="true">
              <span>&#9654;</span>
            </div>
            <div className="testimonial-spotlight-portrait">
              <div className="testimonial-spotlight-portrait-core" />
            </div>
          </div>

          <div className="testimonial-card-footer testimonial-card-footer-spotlight">
            <strong>{testimonial.name}</strong>
            <span>{testimonial.role}</span>
          </div>
        </>
      ) : (
        <>
          <div className="testimonial-header testimonial-header-stacked">
            <div className="testimonial-avatar">
              <img
                src={avatarSrc}
                alt={testimonial.name}
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "inherit",
                  objectFit: "cover",
                  display: "block"
                }}
              />
            </div>
            <div className="testimonial-quote-mark" aria-hidden="true">
              &ldquo;
            </div>
          </div>

          <p className="testimonial-quote">{testimonial.quote}</p>

          <div className="testimonial-card-footer">
            <strong>{testimonial.name}</strong>
            <span>{testimonial.role}</span>
          </div>
        </>
      )}
    </Reveal>
  );
}

export default function TestimonialCarousel({ testimonials }) {
  const viewportRef = useRef(null);
  const [cardsPerView, setCardsPerView] = useState(3);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const visibleCardsPerView = Math.min(cardsPerView, Math.max(testimonials.length, 1));

  useEffect(() => {
    function updateLayout() {
      const width = window.innerWidth;
      setCardsPerView(getCardsPerView(width));
      setViewportWidth(viewportRef.current?.offsetWidth ?? 0);
    }

    updateLayout();
    window.addEventListener("resize", updateLayout, { passive: true });

    return () => window.removeEventListener("resize", updateLayout);
  }, []);

  const maxIndex = Math.max(testimonials.length - visibleCardsPerView, 0);

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, maxIndex));
  }, [maxIndex]);

  const cardWidth = useMemo(() => {
    if (!viewportWidth) return null;
    return (viewportWidth - GAP * (visibleCardsPerView - 1)) / visibleCardsPerView;
  }, [viewportWidth, visibleCardsPerView]);

  function handlePrevious() {
    setActiveIndex((current) => (current === 0 ? maxIndex : current - 1));
  }

  function handleNext() {
    setActiveIndex((current) => (current === maxIndex ? 0 : current + 1));
  }

  const trackStyle = {
    transform: `translate3d(-${activeIndex * ((cardWidth ?? 0) + GAP)}px, 0, 0)`
  };

  return (
    <div className="testimonial-showcase">
      <div className="testimonial-showcase-head">
        <div className="section-heading section-heading-center testimonial-showcase-copy">
          <span className="eyebrow">Testimonials</span>
          <RevealText as="h2" delay={0.06}>
            Don&apos;t take our word for it. Hear it from our clients and stylists.
          </RevealText>
        </div>

        <div className="testimonial-carousel-toolbar">
          <div className="testimonial-carousel-controls" aria-label="Testimonial carousel controls">
            <button
              type="button"
              className="testimonial-carousel-button"
              onClick={handlePrevious}
              aria-label="Previous testimonials"
            >
              <span aria-hidden="true">&#8592;</span>
            </button>
            <button
              type="button"
              className="testimonial-carousel-button"
              onClick={handleNext}
              aria-label="Next testimonials"
            >
              <span aria-hidden="true">&#8594;</span>
            </button>
          </div>
        </div>
      </div>

      <div ref={viewportRef} className="testimonial-carousel-viewport">
        <div className="testimonial-carousel-track" style={trackStyle}>
          {testimonials.map((testimonial, index) => (
            <div
              key={`${testimonial.name}-${index}`}
              className="testimonial-carousel-slide"
              style={{
                width: cardWidth
                  ? `${cardWidth}px`
                  : `calc((100% - ${(visibleCardsPerView - 1) * GAP}px) / ${visibleCardsPerView})`
              }}
            >
              <TestimonialCard testimonial={testimonial} index={index} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
