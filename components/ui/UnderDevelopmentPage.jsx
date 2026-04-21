import Link from "next/link";
import Reveal from "@/components/animated/Reveal";

export default function UnderDevelopmentPage({
  eyebrow = "Under Development",
  title,
  description
}) {
  return (
    <main className="section page-intro">
      <div className="container">
        <Reveal
          className="surface"
          style={{
            maxWidth: 860,
            margin: "0 auto",
            padding: 32
          }}
        >
          <div className="section-heading" style={{ marginBottom: 0 }}>
            <span className="eyebrow">{eyebrow}</span>
            <h1 style={{ fontSize: "clamp(2.6rem, 6vw, 4.6rem)" }}>{title}</h1>
            <p>
              {description}
            </p>
          </div>

          <div className="hero-actions" style={{ marginTop: 22 }}>
            <Link href="/" className="button button-primary">
              Back home
            </Link>
            <Link href="/discover" className="button button-secondary">
              Discover stylists
            </Link>
          </div>
        </Reveal>
      </div>
    </main>
  );
}
