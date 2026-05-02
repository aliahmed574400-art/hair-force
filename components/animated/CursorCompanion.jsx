"use client";

import { useEffect, useRef, useState } from "react";

export default function CursorCompanion({ scopeRef, label = "" }) {
  const dotRef = useRef(null);
  const [active, setActive] = useState(false);
  const [hoveringTarget, setHoveringTarget] = useState(false);

  useEffect(() => {
    const scope = scopeRef?.current;
    if (!scope) return undefined;

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
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`;
      }
      frame = window.requestAnimationFrame(tick);
    }

    function onMove(event) {
      const rect = scope.getBoundingClientRect();
      targetX = event.clientX - rect.left;
      targetY = event.clientY - rect.top;
      setActive(true);
      const target = event.target;
      if (target && target.closest && target.closest("[data-cursor-target]")) {
        setHoveringTarget(true);
      } else {
        setHoveringTarget(false);
      }
    }

    function onLeave() {
      setActive(false);
      setHoveringTarget(false);
    }

    frame = window.requestAnimationFrame(tick);
    scope.addEventListener("pointermove", onMove);
    scope.addEventListener("pointerleave", onLeave);

    return () => {
      window.cancelAnimationFrame(frame);
      scope.removeEventListener("pointermove", onMove);
      scope.removeEventListener("pointerleave", onLeave);
    };
  }, [scopeRef]);

  return (
    <span
      ref={dotRef}
      className={`cursor-companion ${active ? "is-active" : ""} ${hoveringTarget ? "is-target" : ""}`}
      aria-hidden="true"
    >
      <span className="cursor-companion-dot" />
      {hoveringTarget && label ? <span className="cursor-companion-label">{label}</span> : null}
    </span>
  );
}
