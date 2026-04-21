"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BellRing, CalendarClock, CreditCard, LayoutDashboard, Star, UsersRound } from "lucide-react";
import { motion } from "framer-motion";

const ICONS = {
  schedule: CalendarClock,
  payments: CreditCard,
  notifications: BellRing,
  reviews: Star,
  dashboard: LayoutDashboard,
  growth: UsersRound
};

function WhyCardIcon({ name }) {
  const Icon = ICONS[name] || CalendarClock;
  return <Icon strokeWidth={1.8} aria-hidden="true" />;
}

function getWrappedDistance(index, activeIndex, total) {
  let distance = index - activeIndex;
  const half = total / 2;

  if (distance > half) {
    distance -= total;
  } else if (distance < -half) {
    distance += total;
  }

  return distance;
}

function getCardMotion(distance, stageWidth, isMobile) {
  if (isMobile) {
    if (distance === 0) {
      return {
        x: 0,
        scale: 1.06,
        y: -6,
        rotateY: 0,
        opacity: 1,
        blur: 0,
        zIndex: 6
      };
    }

    return {
      x: distance * Math.min(stageWidth * 0.18, 92),
      scale: 0.92,
      y: 10,
      rotateY: 0,
      opacity: 0,
      blur: 0,
      zIndex: 2
    };
  }

  const absDistance = Math.abs(distance);
  const firstOffset = Math.min(stageWidth * 0.27, 320);
  const secondOffset = Math.min(stageWidth * 0.43, 520);
  const thirdOffset = Math.min(stageWidth * 0.58, 700);

  if (absDistance === 0) {
    return {
      x: 0,
      scale: 1,
      y: -8,
      rotateY: 0,
      opacity: 1,
      blur: 0,
      zIndex: 6
    };
  }

  if (absDistance === 1) {
    return {
      x: distance * firstOffset,
      scale: 0.78,
      y: 20,
      rotateY: distance < 0 ? 18 : -18,
      opacity: 0.38,
      blur: 0.8,
      zIndex: 5
    };
  }

  if (absDistance === 2) {
    return {
      x: distance * secondOffset,
      scale: 0.58,
      y: 28,
      rotateY: distance < 0 ? 24 : -24,
      opacity: 0.14,
      blur: 1.8,
      zIndex: 4
    };
  }

  return {
    x: distance * thirdOffset,
    scale: 0.42,
    y: 36,
    rotateY: distance < 0 ? 30 : -30,
    opacity: 0.04,
    blur: 2.6,
    zIndex: 3
  };
}

export default function WhyHairForceRail({ items }) {
  const stageRef = useRef(null);
  const activeIndexRef = useRef(0);
  const wheelLockRef = useRef(false);
  const wheelLockTimeoutRef = useRef(null);
  const gestureRef = useRef({
    pointerId: null,
    startX: 0,
    deltaX: 0,
    swiped: false
  });
  const [activeIndex, setActiveIndex] = useState(0);
  const [stageWidth, setStageWidth] = useState(1200);
  const isMobile = stageWidth <= 640;

  const setCenteredIndex = useCallback((indexOrUpdater) => {
    setActiveIndex((previousIndex) => {
      const nextIndex =
        typeof indexOrUpdater === "function" ? indexOrUpdater(previousIndex) : indexOrUpdater;
      const normalizedIndex = ((nextIndex % items.length) + items.length) % items.length;
      activeIndexRef.current = normalizedIndex;
      return normalizedIndex;
    });
  }, [items.length]);

  const handleWheel = useCallback((event) => {
    if (items.length <= 1) {
      return;
    }

    const absX = Math.abs(event.deltaX);
    const absY = Math.abs(event.deltaY);

    if (Math.max(absX, absY) < 12) {
      return;
    }

    event.preventDefault();
    if (wheelLockRef.current) {
      return;
    }

    const direction = (absX > absY ? event.deltaX : event.deltaY) > 0 ? 1 : -1;

    wheelLockRef.current = true;
    setCenteredIndex((previousIndex) => previousIndex + direction);

    if (wheelLockTimeoutRef.current) {
      window.clearTimeout(wheelLockTimeoutRef.current);
    }

    wheelLockTimeoutRef.current = window.setTimeout(() => {
      wheelLockRef.current = false;
    }, 420);
  }, [items.length, setCenteredIndex]);

  const resetGesture = useCallback(() => {
    gestureRef.current.pointerId = null;
    gestureRef.current.startX = 0;
    gestureRef.current.deltaX = 0;
  }, []);

  const handlePointerDown = useCallback((event) => {
    if (items.length <= 1) {
      return;
    }

    gestureRef.current.pointerId = event.pointerId;
    gestureRef.current.startX = event.clientX;
    gestureRef.current.deltaX = 0;
    gestureRef.current.swiped = false;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, [items.length]);

  const handlePointerMove = useCallback((event) => {
    if (gestureRef.current.pointerId !== event.pointerId) {
      return;
    }

    gestureRef.current.deltaX = event.clientX - gestureRef.current.startX;
  }, []);

  const handlePointerUp = useCallback((event) => {
    if (gestureRef.current.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = gestureRef.current.deltaX;

    if (Math.abs(deltaX) > 56) {
      gestureRef.current.swiped = true;
      setCenteredIndex((previousIndex) => previousIndex + (deltaX < 0 ? 1 : -1));
    }

    event.currentTarget.releasePointerCapture?.(event.pointerId);
    resetGesture();
  }, [resetGesture, setCenteredIndex]);

  const handlePointerCancel = useCallback((event) => {
    if (gestureRef.current.pointerId !== event.pointerId) {
      return;
    }

    event.currentTarget.releasePointerCapture?.(event.pointerId);
    resetGesture();
  }, [resetGesture]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) {
      return undefined;
    }

    const updateStageWidth = () => {
      setStageWidth(stage.clientWidth || 1200);
    };

    updateStageWidth();

    const observer = new ResizeObserver(() => {
      updateStageWidth();
    });

    observer.observe(stage);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
    return () => {
      if (wheelLockTimeoutRef.current) {
        window.clearTimeout(wheelLockTimeoutRef.current);
      }
    };
  }, [activeIndex]);

  useEffect(() => {
    if (!isMobile || items.length <= 1 || typeof window === "undefined") {
      return undefined;
    }

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
      return undefined;
    }

    const autoplayInterval = window.setInterval(() => {
      setCenteredIndex((previousIndex) => previousIndex + 1);
    }, 2600);

    return () => {
      window.clearInterval(autoplayInterval);
    };
  }, [isMobile, items.length, setCenteredIndex]);

  const activeCard = items[activeIndex] ?? items[0];
  const focusX = items.length > 1 ? 14 + (activeIndex / (items.length - 1)) * 72 : 50;

  return (
    <div
      ref={stageRef}
      className={`why-hairforce-stage ${isMobile ? "is-mobile" : ""}`}
      style={{
        "--why-accent": activeCard?.accent ?? "#60A5FA",
        "--why-focus-x": `${focusX}%`
      }}
    >
      <div className="why-hairforce-stage-backdrop" aria-hidden="true" />

      <div
        className="why-hairforce-carousel"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") {
            event.preventDefault();
            setCenteredIndex((previousIndex) => previousIndex + 1);
          }

          if (event.key === "ArrowLeft") {
            event.preventDefault();
            setCenteredIndex((previousIndex) => previousIndex - 1);
          }
        }}
        tabIndex={0}
        aria-label="Why choose Hairforce carousel"
      >
        {items.map((item, index) => {
          const distance = getWrappedDistance(index, activeIndex, items.length);
          const motionState = getCardMotion(distance, stageWidth, isMobile);
          const isActive = distance === 0;

          return (
            <div
              key={item.title}
              className="why-hairforce-card-anchor"
              style={{ zIndex: motionState.zIndex }}
            >
              <motion.article
                className={`why-hairforce-card ${isActive ? "is-active" : ""}`}
                style={{
                  "--card-accent": item.accent,
                  "--card-glow": item.glow
                }}
                animate={{
                  x: motionState.x,
                  y: motionState.y,
                  scale: motionState.scale,
                  rotateY: motionState.rotateY,
                  opacity: motionState.opacity,
                  filter: `blur(${motionState.blur}px)`
                }}
                transition={{ type: "spring", stiffness: 220, damping: 26, mass: 0.8 }}
                onClick={() => {
                  if (gestureRef.current.swiped) {
                    gestureRef.current.swiped = false;
                    return;
                  }

                  setCenteredIndex(index);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setCenteredIndex(index);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`Focus ${item.title}`}
              >
                <div className="why-hairforce-card-icon">
                  <WhyCardIcon name={item.icon} />
                </div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </motion.article>
            </div>
          );
        })}
      </div>
    </div>
  );
}
