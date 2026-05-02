"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import CountUp from "@/components/animated/CountUp";

const GAP = 28;

const FALLBACK_IMAGES = [
  "/featured-stylists/fresha-01.jpg",
  "/featured-stylists/fresha-02.jpg",
  "/featured-stylists/fresha-03.jpg",
  "/featured-stylists/fresha-04.jpg",
  "/featured-stylists/fresha-05.jpg",
  "/featured-stylists/fresha-06.jpg",
  "/featured-stylists/fresha-07.jpg",
  "/featured-stylists/fresha-08.jpg",
  "/featured-stylists/fresha-09.jpg"
];

const SHOWCASE_FALLBACK = [
  {
    slug: "cristan",
    name: "Cristan",
    rating: 5.0,
    reviewCount: 289,
    location: "Austin, Texas",
    category: "Hair Salon",
    image: "/featured-stylists/fresha-01.jpg"
  },
  {
    slug: "ace-hair-and-nail-salon",
    name: "Ace Hair and Nail Salon",
    rating: 4.8,
    reviewCount: 4958,
    location: "Brooklyn, New York",
    category: "Beauty Salon",
    image: "/featured-stylists/fresha-02.jpg"
  },
  {
    slug: "eugenie-salon",
    name: "Eugenie Salon",
    rating: 4.8,
    reviewCount: 608,
    location: "Beverly Hills, California",
    category: "Beauty Salon",
    image: "/featured-stylists/fresha-03.jpg"
  },
  {
    slug: "yin-salon-and-spa",
    name: "Yin Salon and Spa",
    rating: 4.9,
    reviewCount: 498,
    location: "Scottsdale, Arizona",
    category: "Hair Salon",
    image: "/featured-stylists/fresha-04.jpg"
  },
  {
    slug: "top-one-salon-spa",
    name: "Top One Salon Spa",
    rating: 4.9,
    reviewCount: 533,
    location: "Naples, Florida",
    category: "Spa",
    image: "/featured-stylists/fresha-05.jpg"
  },
  {
    slug: "farzaneh-beauty-salon",
    name: "Farzaneh Beauty Salon",
    rating: 4.8,
    reviewCount: 412,
    location: "Seattle, Washington",
    category: "Beauty Salon",
    image: "/featured-stylists/fresha-06.jpg"
  },
  {
    slug: "goat-barber",
    name: "GOAT Barber",
    rating: 4.9,
    reviewCount: 441,
    location: "Chicago, Illinois",
    category: "Barbershop",
    image: "/featured-stylists/fresha-07.jpg"
  },
  {
    slug: "alchemic-beauty-studio",
    name: "Alchemic Beauty Studio",
    rating: 4.8,
    reviewCount: 267,
    location: "Los Angeles, California",
    category: "Beauty Studio",
    image: "/featured-stylists/fresha-08.jpg"
  },
  {
    slug: "the-lair-man",
    name: "The Lair Man",
    rating: 4.9,
    reviewCount: 384,
    location: "Nashville, Tennessee",
    category: "Barbershop",
    image: "/featured-stylists/fresha-09.jpg"
  }
];

function getCardsPerView(width) {
  if (width <= 640) return 1;
  if (width <= 860) return 2;
  if (width <= 1100) return 3;
  return 4;
}

function formatReviewCount(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function normalizeStylist(input, index) {
  if (!input) return null;
  const fallbackImage = FALLBACK_IMAGES[index % FALLBACK_IMAGES.length];
  const image =
    input.image ||
    input.coverImage ||
    input.avatar ||
    (Array.isArray(input.galleryImages) && input.galleryImages[0]) ||
    (Array.isArray(input.portfolioImages) && input.portfolioImages[0]) ||
    fallbackImage;
  const location =
    input.location ||
    [input.city, input.state].filter(Boolean).join(", ") ||
    "United States";
  return {
    slug: input.slug,
    name: input.name,
    rating: Number(input.rating || 0) || 4.9,
    reviewCount: Number(input.reviewCount || 0),
    location,
    category: input.category || "Beauty Studio",
    image
  };
}

function RatingBadge({ rating, reviewCount }) {
  return (
    <div className="featured-salon-rating">
      <span className="featured-salon-star" aria-hidden="true">
        ★
      </span>
      <span className="featured-salon-score">
        <CountUp end={rating} decimals={1} duration={1200} />
      </span>
      {reviewCount > 0 ? (
        <span className="featured-salon-review-count">
          (<CountUp end={reviewCount} duration={1400} />)
        </span>
      ) : null}
    </div>
  );
}

function FeaturedSalonCard({ stylist, index }) {
  return (
    <motion.div
      className="featured-salon-card"
      initial={{ opacity: 0, y: 40, rotateY: -12, scale: 0.94 }}
      whileInView={{ opacity: 1, y: 0, rotateY: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{
        duration: 0.85,
        delay: index * 0.08,
        ease: [0.22, 1, 0.36, 1]
      }}
      style={{ perspective: "1200px", transformStyle: "preserve-3d" }}
    >
      <Link href={`/stylists/${stylist.slug}`} className="featured-salon-link" aria-label={`View ${stylist.name}`}>
        <div className="featured-salon-image-shell">
          <Image
            src={stylist.image}
            alt={stylist.name}
            fill
            sizes="(max-width: 760px) 100vw, (max-width: 1080px) 50vw, (max-width: 1400px) 33vw, 25vw"
            className="featured-salon-image"
            style={{ objectFit: "cover" }}
          />
          <span className="featured-salon-specular" aria-hidden="true" />
        </div>

        <div className="featured-salon-body">
          <div className="featured-salon-title-row">
            <h3>{stylist.name}</h3>
            <RatingBadge rating={stylist.rating} reviewCount={stylist.reviewCount} />
          </div>
          <p className="featured-salon-location">{stylist.location}</p>
          <p className="featured-salon-category">{stylist.category}</p>
        </div>
      </Link>
    </motion.div>
  );
}

export default function FeaturedStylistCarousel({ stylists }) {
  const slides = useMemo(() => {
    const realStylists = Array.isArray(stylists)
      ? stylists.map((stylist, index) => normalizeStylist(stylist, index)).filter(Boolean)
      : [];

    if (realStylists.length >= 4) {
      return realStylists;
    }

    const fillerNeeded = SHOWCASE_FALLBACK.length;
    const usedSlugs = new Set(realStylists.map((stylist) => stylist.slug));
    const filler = SHOWCASE_FALLBACK.filter((stylist) => !usedSlugs.has(stylist.slug)).slice(
      0,
      fillerNeeded - realStylists.length
    );

    return [...realStylists, ...filler];
  }, [stylists]);

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

  const maxIndex = Math.max(slides.length - cardsPerView, 0);

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, maxIndex));
  }, [maxIndex]);

  const cardWidth = useMemo(() => {
    if (!viewportWidth) return null;
    return Math.floor((viewportWidth - GAP * (cardsPerView - 1)) / cardsPerView);
  }, [cardsPerView, viewportWidth]);

  const trackStyle = {
    transform: `translate3d(-${activeIndex * ((cardWidth ?? 0) + GAP)}px, 0, 0)`
  };

  return (
    <div className="featured-stylist-carousel featured-salon-carousel">
      <div className="featured-stylist-carousel-toolbar featured-salon-carousel-toolbar">
        <div className="featured-stylist-carousel-controls" aria-label="Featured stylist carousel controls">
          <button
            type="button"
            className="featured-stylist-carousel-button featured-salon-carousel-button"
            onClick={() => setActiveIndex((current) => Math.max(current - 1, 0))}
            disabled={activeIndex === 0}
            aria-label="Previous featured stylists"
          >
            <span aria-hidden="true">←</span>
          </button>
          <button
            type="button"
            className="featured-stylist-carousel-button featured-salon-carousel-button"
            onClick={() => setActiveIndex((current) => Math.min(current + 1, maxIndex))}
            disabled={activeIndex === maxIndex}
            aria-label="Next featured stylists"
          >
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>

      <div ref={viewportRef} className="featured-stylist-carousel-viewport featured-salon-carousel-viewport">
        <div className="featured-stylist-carousel-track featured-salon-carousel-track" style={trackStyle}>
          {slides.map((stylist, index) => (
            <div
              key={`${stylist.slug}-${index}`}
              className="featured-stylist-carousel-slide featured-salon-carousel-slide"
              style={{
                width: cardWidth ? `${cardWidth}px` : `calc((100% - ${(cardsPerView - 1) * GAP}px) / ${cardsPerView})`
              }}
            >
              <FeaturedSalonCard stylist={stylist} index={index} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
