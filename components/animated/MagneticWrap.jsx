"use client";

import { useEffect, useRef } from "react";

export default function MagneticWrap({ children, strength = 0.35, radius = 80 }) {
  const wrapRef = useRef(null);

  useEffect(() => {
    const node = wrapRef.current;
    if (!node) return undefined;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    if (window.matchMedia("(hover: none)").matches) return undefined;

    let frame = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    function tick() {
      currentX += (targetX - currentX) * 0.18;
      currentY += (targetY - currentY) * 0.18;
      node.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
      frame = window.requestAnimationFrame(tick);
    }

    function onMove(event) {
      const rect = node.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = event.clientX - cx;
      const dy = event.clientY - cy;
      const distance = Math.hypot(dx, dy);
      if (distance < radius) {
        const factor = (1 - distance / radius) * strength;
        targetX = dx * factor;
        targetY = dy * factor;
      } else {
        targetX = 0;
        targetY = 0;
      }
    }

    function onLeave() {
      targetX = 0;
      targetY = 0;
    }

    frame = window.requestAnimationFrame(tick);
    window.addEventListener("pointermove", onMove);
    node.addEventListener("pointerleave", onLeave);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      node.removeEventListener("pointerleave", onLeave);
    };
  }, [strength, radius]);

  return (
    <span ref={wrapRef} className="magnetic-wrap">
      {children}
    </span>
  );
}
