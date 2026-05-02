"use client";

import { useEffect, useRef, useState } from "react";

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function formatValue(value, decimals, locale) {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}

export default function CountUp({
  end,
  start = 0,
  duration = 1400,
  decimals = 0,
  prefix = "",
  suffix = "",
  locale = "en-US",
  className = ""
}) {
  const [display, setDisplay] = useState(start);
  const ref = useRef(null);
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setDisplay(end);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !hasAnimatedRef.current) {
            hasAnimatedRef.current = true;
            const startTime = performance.now();
            let frame = 0;
            const step = (now) => {
              const elapsed = now - startTime;
              const progress = Math.min(elapsed / duration, 1);
              const eased = easeOutCubic(progress);
              setDisplay(start + (end - start) * eased);
              if (progress < 1) {
                frame = requestAnimationFrame(step);
              }
            };
            frame = requestAnimationFrame(step);
            observer.disconnect();
            return () => cancelAnimationFrame(frame);
          }
        }
        return undefined;
      },
      { threshold: 0.3 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [end, start, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {formatValue(display, decimals, locale)}
      {suffix}
    </span>
  );
}
