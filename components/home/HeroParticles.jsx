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
    blur: large ? 18 : 8,
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

    if (!canvas) {
      return undefined;
    }

    const context = canvas.getContext("2d");
    const parent = canvas.parentElement;

    if (!context || !parent) {
      return undefined;
    }

    let width = 0;
    let height = 0;
    let animationFrame = 0;
    let particles = [];
    const pointer = { x: -9999, y: -9999, active: false, vx: 0, vy: 0, lastX: -9999, lastY: -9999 };

    function resize() {
      width = parent.clientWidth;
      height = parent.clientHeight;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = width < 760 ? mobileCount : desktopCount;
      particles = Array.from({ length: count }, (_, index) =>
        createParticle(width, height, index < count * 0.22)
      );
    }

    function drawParticle(particle, time) {
      context.save();
      context.beginPath();
      context.shadowBlur = particle.blur;
      context.shadowColor =
        particle.tint > 0.62 ? "rgba(145, 208, 255, 0.58)" : "rgba(255, 255, 255, 0.34)";
      context.fillStyle =
        particle.tint > 0.62
          ? `rgba(126, 184, 255, ${particle.alpha})`
          : `rgba(255, 255, 255, ${particle.alpha})`;
      context.arc(
        particle.x + Math.sin(time * 0.0015 + particle.sway) * particle.orbitX,
        particle.y + Math.cos(time * 0.00102 + particle.sway) * particle.orbitY,
        particle.radius,
        0,
        Math.PI * 2
      );
      context.fill();
      context.restore();
    }

    function tick(time) {
      context.clearRect(0, 0, width, height);

      for (const particle of particles) {
        const dx = pointer.x - particle.x;
        const dy = pointer.y - particle.y;
        const distance = Math.hypot(dx, dy) || 1;

        if (pointer.active && distance < INTERACTION_RADIUS) {
          const force = (1 - distance / INTERACTION_RADIUS) * INTERACTION_FORCE;
          particle.vx -= (dx / distance) * force;
          particle.vy -= (dy / distance) * force;
          particle.vx += pointer.vx * force * POINTER_SWEEP;
          particle.vy += pointer.vy * force * POINTER_SWEEP;
        }

        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vx *= 0.997;
        particle.vy *= 0.997;

        if (particle.x < -20) particle.x = width + 20;
        if (particle.x > width + 20) particle.x = -20;
        if (particle.y < -20) particle.y = height + 20;
        if (particle.y > height + 20) particle.y = -20;

        particle.vx += (Math.random() - 0.5) * 0.024;
        particle.vy += (Math.random() - 0.5) * 0.02;
        particle.vx = clamp(particle.vx, -1.8, 1.8);
        particle.vy = clamp(particle.vy, -1.56, 1.56);

        drawParticle(particle, time);
      }

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

    resize();
    animationFrame = window.requestAnimationFrame(tick);

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(parent);
    parent.addEventListener("pointermove", handlePointerMove);
    parent.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      parent.removeEventListener("pointermove", handlePointerMove);
      parent.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
