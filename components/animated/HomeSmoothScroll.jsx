"use client";

import { useEffect } from "react";

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export default function HomeSmoothScroll({ children }) {
  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;

    if (prefersReducedMotion || coarsePointer) {
      return undefined;
    }

    let animationFrame = 0;
    let running = false;
    let current = window.scrollY;
    let target = current;

    const getMaxScroll = () => {
      const scrollElement = document.scrollingElement || document.documentElement;
      return Math.max(scrollElement.scrollHeight - window.innerHeight, 0);
    };

    const animateScroll = () => {
      current += (target - current) * 0.12;

      if (Math.abs(target - current) < 0.4) {
        current = target;
      }

      window.scrollTo(0, current);

      if (current !== target) {
        animationFrame = window.requestAnimationFrame(animateScroll);
        return;
      }

      running = false;
      animationFrame = 0;
    };

    const startAnimation = () => {
      if (running) {
        return;
      }

      running = true;
      animationFrame = window.requestAnimationFrame(animateScroll);
    };

    const handleWheel = (event) => {
      if (event.defaultPrevented || event.ctrlKey || event.deltaY === 0) {
        return;
      }

      event.preventDefault();
      target = clamp(target + event.deltaY, 0, getMaxScroll());
      startAnimation();
    };

    const handleScroll = () => {
      if (running) {
        return;
      }

      current = window.scrollY;
      target = current;
    };

    const handleResize = () => {
      target = clamp(target, 0, getMaxScroll());
      current = clamp(window.scrollY, 0, getMaxScroll());
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);

      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, []);

  return children;
}
