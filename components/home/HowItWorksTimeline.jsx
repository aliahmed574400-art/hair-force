"use client";

import { CalendarDays, Scissors, Search, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const ICONS = {
  search: Search,
  choose: Scissors,
  calendar: CalendarDays,
  sparkle: Sparkles
};

const ICON_MOTION_PRESETS = {
  search: {
    animate: {
      x: [0, 2, -2, 0],
      y: [0, -2, 1, 0],
      rotate: [0, 4, -4, 0]
    }
  },
  choose: {
    animate: {
      rotate: [0, -9, 5, -7, 0],
      scale: [1, 1.04, 0.98, 1]
    }
  },
  calendar: {
    animate: {
      y: [0, -4, 0],
      rotate: [0, -3, 3, 0]
    }
  },
  sparkle: {
    animate: {
      scale: [1, 1.08, 0.96, 1],
      rotate: [0, 10, -10, 0]
    }
  }
};

function StepIcon({ name }) {
  const Icon = ICONS[name] || Search;
  return <Icon strokeWidth={1.9} aria-hidden="true" />;
}

export default function HowItWorksTimeline({ steps }) {
  return (
    <div className="how-it-works-timeline">
      <div className="how-it-works-grid">
        {steps.map((step, index) => {
          const isTop = index % 2 === 0;
          const iconMotion = ICON_MOTION_PRESETS[step.icon] ?? ICON_MOTION_PRESETS.search;

          return (
            <motion.article
              key={step.step}
              className={`how-it-works-item ${isTop ? "is-top" : "is-bottom"}`}
              initial={{ opacity: 0, y: isTop ? -28 : 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.55, delay: index * 0.14, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="how-it-works-title-slot">
                <h3>{step.title}</h3>
              </div>

              <div className="how-it-works-axis" aria-hidden="true">
                <span className="how-it-works-axis-base" />
                <motion.span
                  className="how-it-works-axis-fill"
                  initial={{ opacity: 0, scaleX: 0 }}
                  whileInView={{ opacity: 1, scaleX: 1 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.7, delay: 0.22 + index * 0.12, ease: [0.22, 1, 0.36, 1] }}
                />
                <span className="how-it-works-node" />
              </div>

              <div className="how-it-works-icon-slot">
                {isTop ? (
                  <>
                    <span className="how-it-works-spoke" aria-hidden="true" />
                    <div className="how-it-works-icon-wrap">
                      <motion.button
                        type="button"
                        className="how-it-works-icon-circle how-it-works-icon-trigger"
                        aria-label={`${step.title}. ${step.text}`}
                        whileHover={{ scale: 1.08, y: -3 }}
                        whileFocus={{ scale: 1.08, y: -3 }}
                        transition={{ type: "spring", stiffness: 260, damping: 18 }}
                      >
                        <motion.span
                          className="how-it-works-icon-glyph"
                          animate={iconMotion.animate}
                          transition={{
                            duration: 3.8 + index * 0.28,
                            repeat: Infinity,
                            repeatType: "mirror",
                            ease: "easeInOut",
                            delay: index * 0.2
                          }}
                        >
                          <StepIcon name={step.icon} />
                        </motion.span>
                      </motion.button>
                      <div className="how-it-works-hover-card" role="note">
                        <p>{step.text}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="how-it-works-icon-wrap">
                      <motion.button
                        type="button"
                        className="how-it-works-icon-circle how-it-works-icon-trigger"
                        aria-label={`${step.title}. ${step.text}`}
                        whileHover={{ scale: 1.08, y: -3 }}
                        whileFocus={{ scale: 1.08, y: -3 }}
                        transition={{ type: "spring", stiffness: 260, damping: 18 }}
                      >
                        <motion.span
                          className="how-it-works-icon-glyph"
                          animate={iconMotion.animate}
                          transition={{
                            duration: 3.8 + index * 0.28,
                            repeat: Infinity,
                            repeatType: "mirror",
                            ease: "easeInOut",
                            delay: index * 0.2
                          }}
                        >
                          <StepIcon name={step.icon} />
                        </motion.span>
                      </motion.button>
                      <div className="how-it-works-hover-card" role="note">
                        <p>{step.text}</p>
                      </div>
                    </div>
                    <span className="how-it-works-spoke" aria-hidden="true" />
                  </>
                )}
              </div>
            </motion.article>
          );
        })}
      </div>
    </div>
  );
}
