import Reveal from "@/components/animated/Reveal";
import JoinForm from "@/components/ui/JoinForm";
import { vendorBenefits } from "@/lib/data";

export default function JoinPage() {
  return (
    <main className="section page-intro">
      <div className="container listing-grid">
        <section>
          <div className="section-heading">
            <span className="eyebrow">Become a Hair Force partner</span>
            <h1 style={{ fontSize: "clamp(2.7rem, 6vw, 4.8rem)" }}>Turn your profile into a booking engine</h1>
            <p>
              This vendor side is inspired by the same marketplace principles that make beauty platforms powerful: visibility, self-serve scheduling, client trust, and repeat bookings.
            </p>
          </div>

          <div className="two-grid">
            {vendorBenefits.map((item) => (
              <Reveal key={item.title} className="feature-card">
                <h3 style={{ fontFamily: "var(--font-display)", marginTop: 0, fontSize: "1.5rem" }}>
                  {item.title}
                </h3>
                <p className="muted" style={{ marginBottom: 0 }}>
                  {item.text}
                </p>
              </Reveal>
            ))}
          </div>

          <Reveal className="surface" style={{ padding: 28, marginTop: 18 }}>
            <div className="eyebrow">Suggested vendor setup flow</div>
            <div className="timeline" style={{ marginTop: 18 }}>
              {[
                "Create your Hair Force account",
                "Set your profile visuals, category, and location",
                "Add services, durations, and starting prices",
                "Publish next available booking windows",
                "Collect reviews, rebooks, and returning clients"
              ].map((step, index) => (
                <div key={step} className="timeline-item">
                  <span className="badge badge-accent">0{index + 1}</span>
                  <p style={{ margin: "12px 0 0" }}>{step}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        <aside>
          <JoinForm />
        </aside>
      </div>
    </main>
  );
}
