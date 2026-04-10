"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const GAP = 18;

function getCardsPerView(width) {
  if (width <= 700) return 1;
  if (width <= 1180) return 2;
  return 4;
}

function CategoryCarouselCard({ category }) {
  return (
    <article className="category-card">
      <div className="category-card-media">
        <img src={category.image} alt={category.label} loading="lazy" />
      </div>
      <div className="category-card-body">
        <h3>{category.label}</h3>
        <p>{category.description}</p>
      </div>
    </article>
  );
}

export default function CategoryCarousel({ categories }) {
  const viewportRef = useRef(null);
  const [cardsPerView, setCardsPerView] = useState(4);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

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

  const maxIndex = Math.max(categories.length - cardsPerView, 0);

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, maxIndex));
  }, [maxIndex]);

  const cardWidth = useMemo(() => {
    if (!viewportWidth) return null;
    return (viewportWidth - GAP * (cardsPerView - 1)) / cardsPerView;
  }, [cardsPerView, viewportWidth]);

  const trackStyle = {
    transform: `translate3d(-${activeIndex * ((cardWidth ?? 0) + GAP)}px, 0, 0)`
  };

  function handlePrevious() {
    setActiveIndex((current) => Math.max(current - 1, 0));
  }

  function handleNext() {
    setActiveIndex((current) => Math.min(current + 1, maxIndex));
  }

  return (
    <div className="category-carousel">
      <div className="category-carousel-toolbar">
        <div className="category-carousel-meta">
          <span>
            {String(Math.min(activeIndex + cardsPerView, categories.length)).padStart(2, "0")} /{" "}
            {String(categories.length).padStart(2, "0")}
          </span>
        </div>
        <div className="category-carousel-controls" aria-label="Category carousel controls">
          <button
            type="button"
            className="category-carousel-button"
            onClick={handlePrevious}
            disabled={activeIndex === 0}
            aria-label="Previous categories"
          >
            <span aria-hidden="true">&#8592;</span>
          </button>
          <button
            type="button"
            className="category-carousel-button"
            onClick={handleNext}
            disabled={activeIndex === maxIndex}
            aria-label="Next categories"
          >
            <span aria-hidden="true">&#8594;</span>
          </button>
        </div>
      </div>

      <div ref={viewportRef} className="category-carousel-viewport">
        <div className="category-carousel-track" style={trackStyle}>
          {categories.map((category) => (
            <div
              key={category.label}
              className="category-carousel-slide"
              style={{
                width: cardWidth ? `${cardWidth}px` : `calc((100% - ${(cardsPerView - 1) * GAP}px) / ${cardsPerView})`
              }}
            >
              <CategoryCarouselCard category={category} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
