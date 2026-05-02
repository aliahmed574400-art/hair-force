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

    function tick() {
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;
      container.style.setProperty("--parallax-x", currentX.toFixed(2));
      container.style.setProperty("--parallax-y", currentY.toFixed(2));
      frame = window.requestAnimationFrame(tick);
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

    frame = window.requestAnimationFrame(tick);
    container.addEventListener("pointermove", handlePointerMove);
    container.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      window.cancelAnimationFrame(frame);
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
