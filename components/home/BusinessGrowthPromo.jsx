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
            For stylists
          </Reveal>

          <RevealText as="h2" delay={0.06}>
            A toolkit for booked-out salons
          </RevealText>

          <Reveal as="p" delay={0.14} y={22}>
            Manage your service menu, calendar, and client list from one dashboard.
            Set deposits, confirm bookings, skip the phone tag.
          </Reveal>

          <Reveal className="business-promo-actions" delay={0.22} y={16}>
            <Link href="/vendor/signin" className="button button-primary business-promo-button">
              Stylist sign in
            </Link>
          </Reveal>

          <Reveal className="business-promo-proof" delay={0.3} y={18}>
            <strong>Excellent 5/5</strong>
            <div className="business-promo-stars" aria-label="Five star rating">
              {REVIEW_STARS.map((star, index) => (
                <span key={`${star}-${index}`}>{star}</span>
              ))}
            </div>
            <p>Used by independent stylists and small salon teams across the US.</p>
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
