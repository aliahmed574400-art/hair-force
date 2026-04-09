"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import PhoneFrame from "@/components/home/PhoneFrame";

export default function HeroVisual() {
  const scope = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".stage-float",
        { y: 28, opacity: 0, scale: 0.96 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.9,
          stagger: 0.12,
          ease: "power3.out"
        }
      );

      gsap.to(".stage-orb-primary", {
        y: -20,
        x: 12,
        repeat: -1,
        yoyo: true,
        duration: 5,
        ease: "sine.inOut"
      });

      gsap.to(".stage-orb-secondary", {
        y: 18,
        x: -10,
        repeat: -1,
        yoyo: true,
        duration: 6,
        ease: "sine.inOut"
      });

      gsap.to(".stage-device", {
        y: -12,
        repeat: -1,
        yoyo: true,
        duration: 4.2,
        ease: "sine.inOut"
      });
    }, scope);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={scope} className="home-stage">
      <div className="stage-orb stage-orb-primary" />
      <div className="stage-orb stage-orb-secondary" />

      <div className="stage-card stage-card-booking stage-float">
        <span className="stage-card-label">Instant booking</span>
        <strong>Deposit secured</strong>
        <p>Saturday, 7:30 PM with Noor Atelier. Confirmation sent in real time.</p>
      </div>

      <div className="stage-card stage-card-dashboard stage-float">
        <span className="stage-card-label">Vendor dashboard</span>
        <strong>18 new bookings</strong>
        <p>Revenue up 24% this week with recurring clients and faster rebooks.</p>
      </div>

      <div className="stage-device stage-float">
        <PhoneFrame>
          <div className="device-screen">
            <div className="device-screen-top">
              <div>
                <span className="badge badge-accent">Hair Force</span>
                <h3>Discover stylists</h3>
              </div>
              <span className="device-pill">Karachi</span>
            </div>

            <div className="device-highlight">
              <strong>Book the best stylists in your city</strong>
              <p>Find high-rated salons, spas, and barbers with live availability.</p>
            </div>

            <div className="device-list">
              {[
                {
                  name: "Noor Atelier",
                  meta: "Color Specialist",
                  price: "From PKR 3,500",
                  rating: "4.9"
                },
                {
                  name: "Rayan Fade Club",
                  meta: "Modern Barber",
                  price: "From PKR 1,800",
                  rating: "4.8"
                },
                {
                  name: "Safa Skin Spa",
                  meta: "Facial Lounge",
                  price: "From PKR 4,200",
                  rating: "4.9"
                }
              ].map((item) => (
                <div key={item.name} className="device-list-card">
                  <div className="device-avatar">{item.name.slice(0, 1)}</div>
                  <div>
                    <strong>{item.name}</strong>
                    <span>{item.meta}</span>
                  </div>
                  <div className="device-side">
                    <span>{item.rating}</span>
                    <small>{item.price}</small>
                  </div>
                </div>
              ))}
            </div>

            <button className="button button-primary device-button" type="button">
              Find a Stylist
            </button>
          </div>
        </PhoneFrame>
      </div>

      <div className="stage-strip stage-float">
        <span className="badge">Profile pages</span>
        <span className="badge">Payments</span>
        <span className="badge">Reviews</span>
        <span className="badge">Scheduling</span>
      </div>
    </div>
  );
}
