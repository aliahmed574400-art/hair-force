"use client";

import { useState } from "react";
import Reveal from "@/components/animated/Reveal";

export default function FaqAccordion({ items }) {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="faq-accordion" role="list">
      {items.map((item, index) => {
        const isOpen = index === openIndex;

        return (
          <Reveal key={item.q} className={`faq-accordion-item ${isOpen ? "is-open" : ""}`} delay={index * 0.05}>
            <button
              type="button"
              className="faq-accordion-trigger"
              onClick={() => setOpenIndex((current) => (current === index ? -1 : index))}
              aria-expanded={isOpen}
            >
              <span className="faq-accordion-question">{item.q}</span>
              <span className="faq-accordion-icon" aria-hidden="true">
                {isOpen ? "−" : "+"}
              </span>
            </button>

            <div className="faq-accordion-panel" hidden={!isOpen}>
              <p>{item.a}</p>
            </div>
          </Reveal>
        );
      })}
    </div>
  );
}
