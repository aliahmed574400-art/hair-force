"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const AUTO_PLAY_INTERVAL = 3200;
const ITEM_HEIGHT = 68;
const MotionDiv = motion.create("div");

const wrap = (min: number, max: number, value: number) => {
  const rangeSize = max - min;
  return ((((value - min) % rangeSize) + rangeSize) % rangeSize) + min;
};

export type FeatureCarouselItem = {
  id: string;
  label: string;
  description: string;
  image: string;
  icon: LucideIcon;
  alt?: string;
  liveLabel?: string;
};

type FeatureCarouselProps = {
  features: FeatureCarouselItem[];
};

export function FeatureCarousel({ features }: FeatureCarouselProps) {
  const [step, setStep] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const featureCount = features.length;

  const currentIndex = featureCount ? ((step % featureCount) + featureCount) % featureCount : 0;

  const nextStep = useCallback(() => {
    setStep((previous) => previous + 1);
  }, []);

  const handleChipClick = (index: number) => {
    if (!featureCount) {
      return;
    }

    const diff = (index - currentIndex + featureCount) % featureCount;
    if (diff > 0) {
      setStep((previous) => previous + diff);
    }
  };

  useEffect(() => {
    if (isPaused || featureCount <= 1) {
      return undefined;
    }

    const interval = window.setInterval(nextStep, AUTO_PLAY_INTERVAL);
    return () => window.clearInterval(interval);
  }, [featureCount, isPaused, nextStep]);

  if (!featureCount) {
    return null;
  }

  const getCardStatus = (index: number) => {
    const diff = index - currentIndex;
    const length = featureCount;

    let normalizedDiff = diff;
    if (diff > length / 2) normalizedDiff -= length;
    if (diff < -length / 2) normalizedDiff += length;

    if (normalizedDiff === 0) return "active";
    if (normalizedDiff === -1) return "prev";
    if (normalizedDiff === 1) return "next";
    return "hidden";
  };

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="relative overflow-hidden rounded-[2.2rem] border border-slate-200/70 bg-white/80 shadow-[0_24px_70px_rgba(117,148,196,0.16)] backdrop-blur-xl lg:rounded-[3.5rem]">
        <div className="flex min-h-[620px] flex-col lg:min-h-[680px] lg:flex-row">
          <div className="relative z-20 flex min-h-[360px] w-full items-center overflow-hidden bg-[linear-gradient(180deg,#62B2FE_0%,#4797F4_100%)] px-8 py-12 md:min-h-[430px] md:px-14 lg:min-h-0 lg:w-[40%] lg:px-12">
            <div className="absolute inset-x-0 top-0 z-30 h-16 bg-gradient-to-b from-[#62B2FE] via-[#62B2FE]/90 to-transparent md:h-20" />
            <div className="absolute inset-x-0 bottom-0 z-30 h-16 bg-gradient-to-t from-[#4797F4] via-[#4797F4]/90 to-transparent md:h-20" />
            <div className="pointer-events-none absolute inset-y-10 left-6 w-32 rounded-full bg-white/10 blur-3xl" />
            <div className="pointer-events-none absolute bottom-12 right-6 h-32 w-32 rounded-full bg-white/15 blur-3xl" />

            <div className="relative z-20 flex h-full w-full items-center justify-center lg:justify-start">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                const isActive = index === currentIndex;
                const distance = index - currentIndex;
                const wrappedDistance = wrap(-(featureCount / 2), featureCount / 2, distance);

                return (
                  <MotionDiv
                    key={feature.id}
                    style={{ height: ITEM_HEIGHT, width: "fit-content" }}
                    animate={{
                      y: wrappedDistance * ITEM_HEIGHT,
                      opacity: 1 - Math.abs(wrappedDistance) * 0.25
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 90,
                      damping: 22,
                      mass: 1
                    }}
                    className="absolute flex items-center justify-start"
                  >
                    <button
                      type="button"
                      onClick={() => handleChipClick(index)}
                      onMouseEnter={() => setIsPaused(true)}
                      onMouseLeave={() => setIsPaused(false)}
                      className={cn(
                        "group relative flex items-center gap-4 rounded-full border px-6 py-3.5 text-left transition-all duration-700 md:px-9 md:py-5 lg:px-8 lg:py-4",
                        isActive
                          ? "border-white bg-white text-[#4B95EE] shadow-[0_20px_36px_rgba(40,88,150,0.18)]"
                          : "border-white/24 bg-transparent text-white/62 hover:border-white/44 hover:text-white"
                      )}
                    >
                      <div
                        className={cn(
                          "flex items-center justify-center transition-colors duration-500",
                          isActive ? "text-[#4B95EE]" : "text-white/40"
                        )}
                      >
                        <Icon size={18} strokeWidth={2} />
                      </div>

                      <span className="whitespace-nowrap text-sm font-medium uppercase tracking-[0.12em] md:text-[15px]">
                        {feature.label}
                      </span>
                    </button>
                  </MotionDiv>
                );
              })}
            </div>
          </div>

          <div className="relative flex min-h-[500px] flex-1 items-center justify-center overflow-hidden border-t border-slate-200/60 bg-[linear-gradient(180deg,rgba(247,250,255,0.96),rgba(232,241,255,0.86))] px-6 py-16 md:min-h-[620px] md:px-12 md:py-24 lg:min-h-0 lg:border-l lg:border-t-0 lg:px-10 lg:py-16">
            <div className="pointer-events-none absolute left-[12%] top-[12%] h-40 w-40 rounded-full bg-sky-200/45 blur-3xl" />
            <div className="pointer-events-none absolute bottom-[10%] right-[10%] h-48 w-48 rounded-full bg-blue-200/35 blur-3xl" />

            <div className="relative flex aspect-[4/5] w-full max-w-[420px] items-center justify-center">
              {features.map((feature, index) => {
                const status = getCardStatus(index);
                const isActive = status === "active";
                const isPrev = status === "prev";
                const isNext = status === "next";
                const Icon = feature.icon;

                return (
                  <MotionDiv
                    key={feature.id}
                    initial={false}
                    animate={{
                      x: isActive ? 0 : isPrev ? -100 : isNext ? 100 : 0,
                      scale: isActive ? 1 : isPrev || isNext ? 0.85 : 0.7,
                      opacity: isActive ? 1 : isPrev || isNext ? 0.4 : 0,
                      rotate: isPrev ? -3 : isNext ? 3 : 0,
                      zIndex: isActive ? 20 : isPrev || isNext ? 10 : 0,
                      pointerEvents: isActive ? "auto" : "none"
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 260,
                      damping: 25,
                      mass: 0.8
                    }}
                    className="absolute inset-0 overflow-hidden rounded-[2rem] border-[6px] border-white/90 bg-white shadow-[0_22px_48px_rgba(90,121,171,0.18)] md:rounded-[2.8rem] md:border-[8px]"
                  >
                    <div className="relative h-full w-full">
                      <Image
                        src={feature.image}
                        alt={feature.alt || feature.label}
                        fill
                        sizes="(max-width: 1024px) 80vw, 420px"
                        className={cn(
                          "object-cover transition-all duration-700",
                          isActive ? "grayscale-0 blur-0 brightness-100" : "grayscale blur-[2px] brightness-75"
                        )}
                      />
                    </div>

                    <AnimatePresence>
                      {isActive ? (
                        <MotionDiv
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/38 to-transparent p-10 pt-32"
                        >
                          <div className="mb-3 flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/92 px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-700 shadow-lg">
                            <Icon size={14} strokeWidth={2} />
                            <span>{`${index + 1} - ${feature.label}`}</span>
                          </div>
                          <p className="max-w-[18ch] text-xl font-medium leading-tight tracking-tight text-white drop-shadow-md md:text-2xl">
                            {feature.description}
                          </p>
                        </MotionDiv>
                      ) : null}
                    </AnimatePresence>

                    <div
                      className={cn(
                        "absolute left-8 top-8 flex items-center gap-3 transition-opacity duration-300",
                        isActive ? "opacity-100" : "opacity-0"
                      )}
                    >
                      <div className="h-2 w-2 rounded-full bg-white shadow-[0_0_10px_white]" />
                      <span className="font-mono text-[10px] font-medium uppercase tracking-[0.3em] text-white/80">
                        {feature.liveLabel || "Hairforce preview"}
                      </span>
                    </div>
                  </MotionDiv>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FeatureCarousel;
