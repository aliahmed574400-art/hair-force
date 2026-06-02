"use client";

import { useEffect, useRef } from "react";

export default function HeroParallax({ children }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return undefined;

    let frame = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let isVisible = false;

    function tick() {
      const dx = targetX - currentX;
      const dy = targetY - currentY;

      // Only run when there's actual movement or we're settling back to zero
      if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001) {
        currentX += dx * 0.08;
        currentY += dy * 0.08;
        container.style.setProperty("--parallax-x", currentX.toFixed(2));
        container.style.setProperty("--parallax-y", currentY.toFixed(2));
      }

      if (isVisible) {
        frame = window.requestAnimationFrame(tick);
      }
    }

    function handlePointerMove(event) {
      const rect = container.getBoundingClientRect();
      const cx = (event.clientX - rect.left) / rect.width - 0.5;
      const cy = (event.clientY - rect.top) / rect.height - 0.5;
      targetX = cx;
      targetY = cy;
    }

    function handlePointerLeave() {
      targetX = 0;
      targetY = 0;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const wasVisible = isVisible;
          isVisible = entry.isIntersecting;
          if (isVisible && !wasVisible) {
            frame = window.requestAnimationFrame(tick);
          }
        }
      },
      { threshold: 0 }
    );

    observer.observe(container);
    container.addEventListener("pointermove", handlePointerMove);
    container.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      container.removeEventListener("pointermove", handlePointerMove);
      container.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, []);

  return (
    <div ref={containerRef} className="hero-parallax-root">
      {children}
    </div>
  );
}
