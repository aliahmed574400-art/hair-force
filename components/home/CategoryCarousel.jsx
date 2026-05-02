"use client";

import { useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import Link from "next/link";

const AUTOPLAY_PIXELS_PER_SECOND = 28;
const LOOP_COPY_COUNT = 3;
const ORIGINAL_COPY_INDEX = 1;
const DRAG_CLICK_THRESHOLD = 6;

function CategoryCarouselCard({ category, onClickGuard }) {
  return (
    <Link
      href={`/discover?query=${encodeURIComponent(category.label)}`}
      className="category-card-link"
      onClick={onClickGuard}
      draggable={false}
    >
      <article className="category-card">
        <div className="category-card-body">
          <div className="category-card-media">
            <Image
              src={category.image}
              alt={category.label}
              draggable={false}
              fill
              sizes="(max-width: 760px) 25vw, 150px"
              style={{ objectFit: "cover" }}
            />
          </div>
          <div className="category-card-copy">
            <h3>{category.label}</h3>
          </div>
        </div>
    </article>
    </Link>
  );
}

export default function CategoryCarousel({ categories }) {
  const viewportRef = useRef(null);
  const interactionStateRef = useRef({
    isHovering: false
  });
  const dragStateRef = useRef({
    active: false,
    pointerId: null,
    startX: 0,
    startScrollLeft: 0,
    distance: 0
  });

  const loopedCategories = useMemo(
    () =>
      Array.from({ length: LOOP_COPY_COUNT }, (_, copyIndex) =>
        categories.map((category) => ({
          ...category,
          copyIndex,
          isOriginal: copyIndex === ORIGINAL_COPY_INDEX
        }))
      ).flat(),
    [categories]
  );

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport || !categories.length) {
      return undefined;
    }

    function setInitialPosition() {
      viewport.scrollLeft = viewport.scrollWidth / LOOP_COPY_COUNT;
    }

    function normalizeLoopPosition() {
      const singleLoopWidth = viewport.scrollWidth / LOOP_COPY_COUNT;

      if (!singleLoopWidth) {
        return;
      }

      const minBoundary = singleLoopWidth * 0.5;
      const maxBoundary = singleLoopWidth * 1.5;

      if (viewport.scrollLeft < minBoundary) {
        viewport.scrollLeft += singleLoopWidth;
      } else if (viewport.scrollLeft > maxBoundary) {
        viewport.scrollLeft -= singleLoopWidth;
      }
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frameId = 0;
    let lastTimestamp = 0;

    function tick(timestamp) {
      if (!lastTimestamp) {
        lastTimestamp = timestamp;
      }

      const delta = timestamp - lastTimestamp;
      lastTimestamp = timestamp;

      if (!prefersReducedMotion.matches && !dragStateRef.current.active && !interactionStateRef.current.isHovering) {
        viewport.scrollLeft += (AUTOPLAY_PIXELS_PER_SECOND * delta) / 1000;
      }

      frameId = window.requestAnimationFrame(tick);
    }

    function handleResize() {
      setInitialPosition();
      lastTimestamp = 0;
    }

    frameId = window.requestAnimationFrame((timestamp) => {
      setInitialPosition();
      lastTimestamp = timestamp;
      frameId = window.requestAnimationFrame(tick);
    });
    viewport.addEventListener("scroll", normalizeLoopPosition, { passive: true });
    window.addEventListener("resize", handleResize);

    return () => {
      window.cancelAnimationFrame(frameId);
      viewport.removeEventListener("scroll", normalizeLoopPosition);
      window.removeEventListener("resize", handleResize);
    };
  }, [categories.length]);

  function handlePointerDown(event) {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    dragStateRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: viewport.scrollLeft,
      distance: 0
    };

    viewport.dataset.dragging = "true";
    viewport.setPointerCapture?.(event.pointerId);
  }

  function handlePointerMove(event) {
    const viewport = viewportRef.current;
    const dragState = dragStateRef.current;

    if (!viewport || !dragState.active) {
      return;
    }

    const deltaX = event.clientX - dragState.startX;
    dragState.distance = Math.max(dragState.distance, Math.abs(deltaX));
    event.preventDefault();
    viewport.scrollLeft = dragState.startScrollLeft - deltaX;
  }

  function endDrag(event) {
    const viewport = viewportRef.current;
    const dragState = dragStateRef.current;

    if (!viewport || !dragState.active) {
      return;
    }

    if (dragState.pointerId !== null) {
      viewport.releasePointerCapture?.(dragState.pointerId);
    }

    dragStateRef.current = {
      active: false,
      pointerId: null,
      startX: 0,
      startScrollLeft: viewport.scrollLeft
    };

    delete viewport.dataset.dragging;
  }

  function handlePointerEnter() {
    interactionStateRef.current.isHovering = true;
  }

  function handlePointerLeave(event) {
    interactionStateRef.current.isHovering = false;
    endDrag(event);
  }

  function preventClickIfDragged(event) {
    if (dragStateRef.current.distance > DRAG_CLICK_THRESHOLD) {
      event.preventDefault();
    }
  }

  return (
    <div className="category-carousel">
      <div
        ref={viewportRef}
        className="category-carousel-viewport"
        onDragStart={(event) => event.preventDefault()}
        onPointerCancel={endDrag}
        onPointerDown={handlePointerDown}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
      >
        <div className="category-carousel-track">
          {loopedCategories.map((category, index) => (
            <div
              key={`${category.label}-${category.copyIndex}-${index}`}
              aria-hidden={!category.isOriginal}
              className="category-carousel-slide"
            >
              <CategoryCarouselCard category={category} onClickGuard={preventClickIfDragged} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
