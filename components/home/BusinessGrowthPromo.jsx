import Image from "next/image";
import Link from "next/link";
import Reveal from "@/components/animated/Reveal";
import RevealText from "@/components/animated/RevealText";

const REVIEW_STARS = ["\u2605", "\u2605", "\u2605", "\u2605", "\u2605"];

export default function BusinessGrowthPromo() {
  return (
    <div className="business-promo-showcase">
      <div className="business-promo-grid">
        <div className="business-promo-copy">
          <Reveal as="span" className="eyebrow" y={18}>
            Hair Force for business
          </Reveal>

          <RevealText as="h2" delay={0.06}>
            Hair Force for business
          </RevealText>

          <Reveal as="p" delay={0.14} y={22}>
            Supercharge your business with a polished booking platform for salons,
            spas, barbers, and beauty professionals. Manage schedules, staff, and
            client demand from one refined system.
          </Reveal>

          <Reveal className="business-promo-actions" delay={0.22} y={16}>
            <Link href="/join" className="button button-primary business-promo-button">
              Find out more
            </Link>
          </Reveal>

          <Reveal className="business-promo-proof" delay={0.3} y={18}>
            <strong>Excellent 5/5</strong>
            <div className="business-promo-stars" aria-label="Five star rating">
              {REVIEW_STARS.map((star, index) => (
                <span key={`${star}-${index}`}>{star}</span>
              ))}
            </div>
            <p>Trusted by modern salon teams and independent beauty professionals.</p>
          </Reveal>
        </div>

        <Reveal className="business-promo-visual" delay={0.16} y={26}>
          <div className="business-promo-glow" aria-hidden="true" />
          <div className="business-promo-frame">
            <Image
              src="/business-promo/hairforce-business-promo.png"
              alt="Hair Force business dashboard and mobile booking preview"
              width={995}
              height={567}
              className="business-promo-image"
              priority
            />
          </div>
        </Reveal>
      </div>
    </div>
  );
}
