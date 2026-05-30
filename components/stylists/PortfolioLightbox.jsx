"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

function getInitials(name) {
  return String(name || "HF")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function ThumbCaption({ service, item }) {
  if (service) {
    return (
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-1.5">
        <p className="truncate text-[10px] font-semibold text-white">
          {service.title}
        </p>
        <p className="truncate text-[9px] text-gray-300">
          {formatCurrency(service.price)} · {service.duration}
        </p>
      </div>
    );
  }

  if (item?.caption) {
    return (
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
        <p className="truncate text-[10px] font-medium text-white">
          {item.caption}
        </p>
      </div>
    );
  }

  return null;
}

export default function PortfolioLightbox({
  items = [],
  initialIndex = 0,
  stylist,
  services = [],
  onClose,
  onSeeTimes
}) {
  const total = items.length;
  const [index, setIndex] = useState(() =>
    Math.min(Math.max(0, initialIndex), Math.max(0, total - 1))
  );
  const [descExpanded, setDescExpanded] = useState(false);

  useEffect(() => {
    setIndex(Math.min(Math.max(0, initialIndex), Math.max(0, total - 1)));
    setDescExpanded(false);
  }, [initialIndex, total]);

  useEffect(() => {
    setDescExpanded(false);
  }, [index]);

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
      if (event.key === "ArrowRight") setIndex((i) => Math.min(total - 1, i + 1));
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose, total]);

  const servicesById = useMemo(() => {
    const map = new Map();
    services.forEach((service) => {
      if (service?.id) map.set(String(service.id), service);
    });
    return map;
  }, [services]);

  const item = items[index];
  if (!item) return null;

  const linkedService = item.serviceId
    ? servicesById.get(String(item.serviceId))
    : null;

  const handlePrev = () => setIndex((i) => Math.max(0, i - 1));
  const handleNext = () => setIndex((i) => Math.min(total - 1, i + 1));

  return (
    <div
      className="fixed inset-0 z-[90] bg-black text-white"
      role="dialog"
      aria-modal="true"
      aria-label={`${stylist.name} portfolio gallery`}
    >
      {/* Top bar */}
      <header className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-[#2856f8] to-[#54b6ff]">
            {stylist.avatar ? (
              <img
                src={stylist.avatar}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-medium tracking-tight">
                {getInitials(stylist.name)}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">
              {stylist.name}
            </p>
            <p className="truncate text-xs text-gray-400 leading-tight">
              {stylist.businessInfo?.businessName ||
                `${stylist.category || "Stylist"}`}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close gallery"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-300 transition hover:bg-white/10 hover:text-white"
        >
          <X size={20} strokeWidth={2} aria-hidden="true" />
        </button>
      </header>

      {/* Content */}
      <div className="grid grid-cols-1 gap-4 px-4 pb-4 sm:px-6 sm:pb-6 md:grid-cols-[1fr_360px] md:gap-4 md:h-[calc(100vh-76px)]">
        {/* Main image */}
        <div className="relative flex min-h-0 items-center justify-center">
          {total > 1 ? (
            <button
              type="button"
              onClick={handlePrev}
              disabled={index === 0}
              aria-label="Previous photo"
              className="absolute left-2 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30 md:flex"
            >
              <ChevronLeft size={22} strokeWidth={2} aria-hidden="true" />
            </button>
          ) : null}

          <div className="relative flex h-full max-h-[60vh] w-full items-center justify-center overflow-hidden rounded-xl bg-black md:max-h-none">
            {item.type === "video" ? (
              <video
                src={item.url}
                controls
                playsInline
                className="h-full w-full object-contain"
              />
            ) : (
              <img
                src={item.url}
                alt={item.caption || `${stylist.name} portfolio ${index + 1}`}
                className="h-full w-full object-contain"
              />
            )}

            {/* Counter */}
            <span className="absolute left-1/2 top-3 -translate-x-1/2 rounded-md bg-black/70 px-3 py-1 text-xs font-medium tabular-nums">
              {index + 1}/{total}
            </span>

            {/* Linked-service card */}
            {linkedService ? (
              <div className="absolute bottom-3 left-3 right-3 rounded-2xl bg-white p-4 text-gray-900 shadow-2xl md:right-auto md:max-w-[28rem]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-bold tracking-tight">
                      {linkedService.title}
                    </h3>
                    <p className="mt-0.5 text-sm text-gray-500">
                      {formatCurrency(linkedService.price)}
                      {linkedService.metadata?.priceIsStartingAt ? "+" : ""}
                      <span className="mx-1.5 text-gray-300">·</span>
                      {linkedService.duration}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSeeTimes?.(linkedService)}
                    className="shrink-0 rounded-md bg-gray-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-black"
                  >
                    See Times
                  </button>
                </div>
                {linkedService.description ? (
                  <>
                    <p
                      className={`mt-2 text-sm text-gray-700 ${
                        descExpanded ? "" : "line-clamp-2"
                      }`}
                    >
                      {linkedService.description}
                    </p>
                    <button
                      type="button"
                      onClick={() => setDescExpanded((v) => !v)}
                      className="mt-1 text-xs font-semibold text-[#2856f8] hover:underline"
                    >
                      {descExpanded ? "Show Less" : "Read More"}
                    </button>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>

          {total > 1 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={index === total - 1}
              aria-label="Next photo"
              className="absolute right-2 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30 md:flex"
            >
              <ChevronRight size={22} strokeWidth={2} aria-hidden="true" />
            </button>
          ) : null}
        </div>

        {/* Thumbnails */}
        <div className="overflow-y-auto pr-1">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-3">
            {items.map((thumb, i) => {
              const isActive = i === index;
              const thumbService = thumb.serviceId
                ? servicesById.get(String(thumb.serviceId))
                : null;
              return (
                <button
                  key={`${thumb.url}-${i}`}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-current={isActive ? "true" : undefined}
                  className={`relative aspect-square overflow-hidden rounded-md bg-gray-900 transition ${
                    isActive
                      ? "ring-2 ring-[#54b6ff] ring-offset-2 ring-offset-black"
                      : "opacity-85 hover:opacity-100"
                  }`}
                >
                  {thumb.type === "video" ? (
                    <video
                      src={thumb.url}
                      muted
                      playsInline
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <img
                      src={thumb.url}
                      alt={thumb.caption || ""}
                      className="h-full w-full object-cover"
                    />
                  )}
                  <ThumbCaption service={thumbService} item={thumb} />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile prev/next strip */}
      {total > 1 ? (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-between px-2 md:hidden">
          <button
            type="button"
            onClick={handlePrev}
            disabled={index === 0}
            aria-label="Previous photo"
            className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronLeft size={20} strokeWidth={2} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={index === total - 1}
            aria-label="Next photo"
            className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronRight size={20} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
