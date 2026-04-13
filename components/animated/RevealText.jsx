"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";

export default function RevealText({
  as: Component = "h2",
  children,
  className,
  delay = 0
}) {
  const prefersReducedMotion = useReducedMotion();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.35 });
  const words = String(children ?? "").split(" ").filter(Boolean);
  const MotionComponent = motion[Component] ?? motion.h2;

  if (prefersReducedMotion) {
    return <Component className={className}>{children}</Component>;
  }

  return (
    <MotionComponent ref={ref} className={`reveal-text ${className ?? ""}`.trim()} aria-label={children}>
      {words.map((word, index) => (
        <span key={`${word}-${index}`} className="reveal-text-word" aria-hidden="true">
          <motion.span
            className="reveal-text-word-inner"
            initial={{ y: "108%", opacity: 0 }}
            animate={isInView ? { y: "0%", opacity: 1 } : { y: "108%", opacity: 0 }}
            transition={{
              duration: 0.68,
              delay: delay + index * 0.045,
              ease: [0.22, 1, 0.36, 1]
            }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </MotionComponent>
  );
}
