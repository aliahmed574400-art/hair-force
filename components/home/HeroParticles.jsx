"use client";

import { useEffect, useRef } from "react";

const MOBILE_PARTICLES = 760;
const DESKTOP_PARTICLES = 1380;
const INTERACTION_RADIUS = 260;
const INTERACTION_FORCE = 1.6;
const POINTER_SWEEP = 0.055;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function createParticle(width, height, large = false) {
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * (large ? 0.52 : 0.92),
    vy: (Math.random() - 0.5) * (large ? 0.42 : 0.78),
    radius: large ? Math.random() * 3.8 + 2.8 : Math.random() * 1.8 + 0.4,
    alpha: large ? Math.random() * 0.18 + 0.08 : Math.random() * 0.55 + 0.18,
    tint: Math.random(),
    sway: Math.random() * Math.PI * 2,
    orbitX: large ? Math.random() * 8 + 6 : Math.random() * 4 + 2,
    orbitY: large ? Math.random() * 6 + 4 : Math.random() * 3 + 1.5
  };
}

export default function HeroParticles({
  className = "hero-particles-canvas",
  mobileCount = MOBILE_PARTICLES,
  desktopCount = DESKTOP_PARTICLES
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const context = canvas.getContext("2d", { alpha: true });
    const parent = canvas.parentElement;
    if (!context || !parent) return undefined;

    let width = 0;
    let height = 0;
    let animationFrame = 0;
    let particles = [];
    let isVisible = true;
    let hasResized = false;
    const pointer = { x: -9999, y: -9999, active: false, vx: 0, vy: 0, lastX: -9999, lastY: -9999 };

    function resize() {
      width = parent.clientWidth;
      height = parent.clientHeight;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = width < 760 ? mobileCount : desktopCount;
      particles = Array.from({ length: count }, (_, index) =>
        createParticle(width, height, index < count * 0.22)
      );
      hasResized = true;
    }

    // Batch draw particles by color to minimize fillStyle changes.
    // Glow is simulated by drawing a larger, more transparent circle first,
    // then the core particle on top — this avoids expensive shadowBlur.
    function drawParticles(time) {
      const blueParticles = [];
      const whiteParticles = [];

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const dx = pointer.x - p.x;
        const dy = pointer.y - p.y;
        const distance = Math.hypot(dx, dy) || 1;

        if (pointer.active && distance < INTERACTION_RADIUS) {
          const force = (1 - distance / INTERACTION_RADIUS) * INTERACTION_FORCE;
          p.vx -= (dx / distance) * force;
          p.vy -= (dy / distance) * force;
          p.vx += pointer.vx * force * POINTER_SWEEP;
          p.vy += pointer.vy * force * POINTER_SWEEP;
        }

        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.997;
        p.vy *= 0.997;

        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;
        if (p.y < -20) p.y = height + 20;
        if (p.y > height + 20) p.y = -20;

        p.vx += (Math.random() - 0.5) * 0.024;
        p.vy += (Math.random() - 0.5) * 0.02;
        p.vx = clamp(p.vx, -1.8, 1.8);
        p.vy = clamp(p.vy, -1.56, 1.56);

        const ox = Math.sin(time * 0.0015 + p.sway) * p.orbitX;
        const oy = Math.cos(time * 0.00102 + p.sway) * p.orbitY;
        const px = p.x + ox;
        const py = p.y + oy;

        if (p.tint > 0.62) {
          blueParticles.push(px, py, p.radius, p.alpha);
        } else {
          whiteParticles.push(px, py, p.radius, p.alpha);
        }
      }

      // Draw glow layer (larger, more transparent)
      context.globalCompositeOperation = "screen";

      if (blueParticles.length) {
        context.fillStyle = "rgba(126, 184, 255, 0.06)";
        for (let i = 0; i < blueParticles.length; i += 4) {
          const r = blueParticles[i + 2] * 2.5;
          context.beginPath();
          context.arc(blueParticles[i], blueParticles[i + 1], r, 0, Math.PI * 2);
          context.fill();
        }
      }
      if (whiteParticles.length) {
        context.fillStyle = "rgba(255, 255, 255, 0.04)";
        for (let i = 0; i < whiteParticles.length; i += 4) {
          const r = whiteParticles[i + 2] * 2.5;
          context.beginPath();
          context.arc(whiteParticles[i], whiteParticles[i + 1], r, 0, Math.PI * 2);
          context.fill();
        }
      }

      // Draw core particles
      if (blueParticles.length) {
        context.fillStyle = "rgba(126, 184, 255, 0.55)";
        for (let i = 0; i < blueParticles.length; i += 4) {
          context.beginPath();
          context.arc(blueParticles[i], blueParticles[i + 1], blueParticles[i + 2], 0, Math.PI * 2);
          context.fill();
        }
      }
      if (whiteParticles.length) {
        context.fillStyle = "rgba(255, 255, 255, 0.45)";
        for (let i = 0; i < whiteParticles.length; i += 4) {
          context.beginPath();
          context.arc(whiteParticles[i], whiteParticles[i + 1], whiteParticles[i + 2], 0, Math.PI * 2);
          context.fill();
        }
      }

      context.globalCompositeOperation = "source-over";
    }

    function tick(time) {
      if (!isVisible) {
        animationFrame = window.requestAnimationFrame(tick);
        return;
      }

      if (hasResized) {
        context.clearRect(0, 0, width, height);
        hasResized = false;
      } else {
        context.clearRect(0, 0, width, height);
      }

      drawParticles(time);
      animationFrame = window.requestAnimationFrame(tick);
    }

    function handlePointerMove(event) {
      const rect = parent.getBoundingClientRect();
      const nextX = event.clientX - rect.left;
      const nextY = event.clientY - rect.top;

      if (pointer.lastX > -9000 && pointer.lastY > -9000) {
        pointer.vx = clamp(nextX - pointer.lastX, -24, 24);
        pointer.vy = clamp(nextY - pointer.lastY, -24, 24);
      }

      pointer.x = nextX;
      pointer.y = nextY;
      pointer.lastX = nextX;
      pointer.lastY = nextY;
      pointer.active = true;
    }

    function handlePointerLeave() {
      pointer.active = false;
      pointer.vx = 0;
      pointer.vy = 0;
      pointer.lastX = -9999;
      pointer.lastY = -9999;
      pointer.x = -9999;
      pointer.y = -9999;
    }

    // Pause when off-screen to save CPU
    const visibilityObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          isVisible = entry.isIntersecting;
        }
      },
      { threshold: 0 }
    );

    resize();
    animationFrame = window.requestAnimationFrame(tick);
    visibilityObserver.observe(canvas);

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(parent);
    parent.addEventListener("pointermove", handlePointerMove);
    parent.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      visibilityObserver.disconnect();
      resizeObserver.disconnect();
      parent.removeEventListener("pointermove", handlePointerMove);
      parent.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [mobileCount, desktopCount]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
