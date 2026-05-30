"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type VendorSigninHeroSlide = {
  id: string;
  src: string;
  alt: string;
  photographer: string;
  photographerUrl?: string;
  pexelsUrl?: string;
};

type VendorSigninHeroSliderProps = {
  slides: VendorSigninHeroSlide[];
};

const AUTO_ADVANCE_MS = 3400;
const TRANSITION_MS = 900;

export default function VendorSigninHeroSlider({ slides }: VendorSigninHeroSliderProps) {
  const normalizedSlides = Array.isArray(slides) && slides.length ? slides : [];
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [slides.length]);

  useEffect(() => {
    if (normalizedSlides.length <= 1) return undefined;

    const intervalId = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % normalizedSlides.length);
    }, AUTO_ADVANCE_MS);

    return () => window.clearInterval(intervalId);
  }, [normalizedSlides.length]);

  if (!normalizedSlides.length) {
    return null;
  }

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {normalizedSlides.map((slide, index) => (
        <div
          key={`${slide.id}-${index}`}
          className="absolute inset-0"
          style={{
            opacity: index === activeIndex ? 1 : 0,
            transition: `opacity ${TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
            zIndex: index === activeIndex ? 1 : 0,
            pointerEvents: index === activeIndex ? "auto" : "none"
          }}
        >
          <Image
            src={slide.src}
            alt={slide.alt}
            fill
            priority={index === 0}
            sizes="(max-width: 1023px) 100vw, 52vw"
            className="object-cover"
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(8,15,37,0.08),rgba(8,15,37,0.22)_48%,rgba(8,15,37,0.4)_100%)]" />
        </div>
      ))}
    </div>
  );
}
