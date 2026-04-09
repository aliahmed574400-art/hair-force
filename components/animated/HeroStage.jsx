"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

export default function HeroStage() {
  const scope = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".hero-float",
        { y: 26, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.9, stagger: 0.15, ease: "power3.out" }
      );

      gsap.to(".hero-orb.one", {
        y: -16,
        x: 10,
        repeat: -1,
        yoyo: true,
        duration: 4,
        ease: "sine.inOut"
      });

      gsap.to(".hero-orb.two", {
        y: 14,
        x: -8,
        repeat: -1,
        yoyo: true,
        duration: 5,
        ease: "sine.inOut"
      });
    }, scope);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={scope} className="hero-stage">
      <div className="hero-orb one" />
      <div className="hero-orb two" />

      <div className="hero-panel desktop hero-float">
        <div className="hero-panel-card">
          <div className="eyebrow">Hair Force Web App</div>
          <h3 style={{ margin: "14px 0 10px", fontFamily: "var(--font-display)", fontSize: "2rem" }}>
            Book the best stylists in your city
          </h3>
          <p className="muted" style={{ margin: 0, maxWidth: 420 }}>
            A polished booking experience for salons, spas, beauty parlors, barbers, and independent artists.
          </p>
          <div className="hero-actions" style={{ marginTop: 18 }}>
            <span className="badge badge-accent">Find a stylist</span>
            <span className="badge">Join as stylist</span>
          </div>
        </div>

        <div className="hero-mini-grid">
          {["Salon", "Barber", "Spa"].map((label, index) => (
            <div key={label} className="hero-mini-card">
              <div className="portrait" style={{ height: 110, opacity: 0.96 - index * 0.08 }} />
              <div className="card-body" style={{ padding: 14 }}>
                <strong style={{ display: "block", marginBottom: 4 }}>{label}</strong>
                <span className="muted tiny">Premium vendor profile</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="hero-panel phone hero-float">
        <div className="hero-panel-card">
          <div className="badge badge-accent">Hair Force Mobile</div>
          <div className="portrait-card" style={{ marginTop: 14 }}>
            <div className="portrait" />
            <div className="card-body">
              <div className="card-title">
                <div>
                  <h4>Noor Atelier</h4>
                  <span className="muted tiny">Karachi • Salon</span>
                </div>
                <span className="badge">4.9</span>
              </div>
              <div className="chip-row">
                <span className="chip">Balayage</span>
                <span className="chip">Blowout</span>
              </div>
              <button className="button button-primary" style={{ width: "100%", marginTop: 16 }}>
                Book now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
