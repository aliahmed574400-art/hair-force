"use client";

import { motion } from "framer-motion";

export default function Reveal({ children, className, delay = 0, y = 26, style, as = "div" }) {
  const MotionComponent = motion[as] ?? motion.div;

  return (
    <MotionComponent
      className={className}
      style={style}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
    >
      {children}
    </MotionComponent>
  );
}
