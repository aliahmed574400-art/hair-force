"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import Reveal from "@/components/animated/Reveal";

const GAP = 18;

const FEATURED_STYLIST_IMAGES = {
  "noor-atelier":
    "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80",
  "rayan-fade-club":
    "https://images.unsplash.com/photo-1517832606299-7ae9b720a186?auto=format&fit=crop&w=900&q=80",
  "safa-skin-spa":
    "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=900&q=80",
  "zoya-bridal-room":
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80"
};

function getCardsPerView(width) {
  if (width <= 760) return 1;
  if (width <= 1180) return 2;
  return 4;
}

function getStylistImage(stylist) {
  if (stylist.coverImage) return stylist.coverImage;
  if (Array.isArray(stylist.galleryImages) && stylist.galleryImages[0]) return stylist.galleryImages[0];
  return FEATURED_STYLIST_IMAGES[stylist.slug] || FEATURED_STYLIST_IMAGES["rayan-fade-club"];
}

function StarRating({ rating = 5 }) {
  return (
    <div className="rating-row featured-card-rating-row" aria-label={`${rating} star rating`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <span key={index} className={`rating-star ${index < Math.round(rating) ? "is-active" : ""}`}>
          &#9733;
        </span>
      ))}
      <span className="featured-card-rating-value">{rating.toFixed(1)}</span>
    </div>
  );
}

function FeaturedStylistCard({ stylist, index }) {
  const image = getStylistImage(stylist);

  return (
    <Reveal className="featured-stylist-card featured-stylist-card-portrait" delay={index * 0.06}>
      <div className="featured-stylist-image-wrap">
        <img src={image} alt={stylist.name} loading="lazy" className="featured-stylist-image" />
      </div>

      <div className="featured-stylist-body featured-stylist-body-portrait">
        <div className="featured-stylist-name-row">
          <h3>{stylist.name}</h3>
        </div>

        <StarRating rating={stylist.rating} />

        <Link href={`/book/${stylist.slug}`} className="button button-primary featured-stylist-book">
          Book Now
        </Link>
      </div>
    </Reveal>
  );
}

export default function FeaturedStylistCarousel({ stylists }) {
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

  const maxIndex = Math.max(stylists.length - cardsPerView, 0);

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

  return (
    <div className="featured-stylist-carousel">
      <div className="featured-stylist-carousel-toolbar">
        <div className="featured-stylist-carousel-controls" aria-label="Featured stylist carousel controls">
          <button
            type="button"
            className="featured-stylist-carousel-button"
            onClick={() => setActiveIndex((current) => Math.max(current - 1, 0))}
            disabled={activeIndex === 0}
            aria-label="Previous featured stylists"
          >
            <span aria-hidden="true">&#8592;</span>
          </button>
          <button
            type="button"
            className="featured-stylist-carousel-button"
            onClick={() => setActiveIndex((current) => Math.min(current + 1, maxIndex))}
            disabled={activeIndex === maxIndex}
            aria-label="Next featured stylists"
          >
            <span aria-hidden="true">&#8594;</span>
          </button>
        </div>
      </div>

      <div ref={viewportRef} className="featured-stylist-carousel-viewport">
        <div className="featured-stylist-carousel-track" style={trackStyle}>
          {stylists.map((stylist, index) => (
            <div
              key={stylist.slug}
              className="featured-stylist-carousel-slide"
              style={{
                width: cardWidth ? `${cardWidth}px` : `calc((100% - ${(cardsPerView - 1) * GAP}px) / ${cardsPerView})`
              }}
            >
              <FeaturedStylistCard stylist={stylist} index={index} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
