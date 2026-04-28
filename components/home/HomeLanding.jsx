import Reveal from "@/components/animated/Reveal";
import RevealText from "@/components/animated/RevealText";
import AppPreviewSection from "@/components/home/AppPreviewSection";
import BusinessGrowthPromo from "@/components/home/BusinessGrowthPromo";
import CategoryCarousel from "@/components/home/CategoryCarousel";
import FaqAccordion from "@/components/home/FaqAccordion";
import FeaturedStylistCarousel from "@/components/home/FeaturedStylistCarousel";
import HeroBanner from "@/components/home/HeroBanner";
import HowItWorksTimeline from "@/components/home/HowItWorksTimeline";
import StickySearchBar from "@/components/home/StickySearchBar";
import TestimonialCarousel from "@/components/home/TestimonialCarousel";
import WhyHairForceRail from "@/components/home/WhyHairForceRail";
import {
  faqs,
  homeServiceCategories,
  howItWorks,
  testimonials
} from "@/lib/data";

function HomeIcon({ name }) {
  switch (name) {
    case "scissors":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M8 6a2.75 2.75 0 1 1-5.5 0A2.75 2.75 0 0 1 8 6Zm0 12a2.75 2.75 0 1 1-5.5 0A2.75 2.75 0 0 1 8 18Zm2.5-6 10-7M10.5 12l10 7M7.9 7.6l3.1 3.1m-3.1 5.7 3.1-3.1"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
      );
    case "beard":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M8 7.5C8 5 9.9 3 12.2 3 14.7 3 16.5 5 16.5 7.6c1.5.4 2.5 1.8 2.5 3.5 0 1.6-.9 3-2.3 3.5-.5 3.5-2.7 5.4-4.9 5.4-2.2 0-4.5-1.9-5-5.4A3.7 3.7 0 0 1 4.5 11c0-1.7 1.1-3.2 2.7-3.5"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
      );
    case "style":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 3c3.8 0 6.8 2.8 6.8 6.4 0 3.7-3.2 7.5-6.8 11.6C8.4 16.9 5.2 13.1 5.2 9.4 5.2 5.8 8.2 3 12 3Z"
            fill="none"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
          <path
            d="M9.5 9.2c.7-.9 1.5-1.3 2.5-1.3 1.1 0 1.9.4 2.5 1.3"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.8"
          />
        </svg>
      );
    case "color":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 3 5 11.2A4.8 4.8 0 0 0 8.7 19h6.6a4.8 4.8 0 0 0 3.7-7.8L12 3Z"
            fill="none"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
          <path
            d="M9 15.2c1 .9 1.9 1.3 3 1.3 1.1 0 2-.4 3-1.3"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.8"
          />
        </svg>
      );
    case "facial":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 3c3.6 0 6.2 2.6 6.2 6.3v2.5c0 4.6-2.7 8.2-6.2 8.2s-6.2-3.6-6.2-8.2V9.3C5.8 5.6 8.4 3 12 3Z"
            fill="none"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
          <path
            d="M9.3 10.4v1.1M14.7 10.4v1.1M9.8 14.6c.7.6 1.4.9 2.2.9.8 0 1.5-.3 2.2-.9"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.8"
          />
        </svg>
      );
    case "search":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="m16 16 4.2 4.2" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        </svg>
      );
    case "service":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="5" width="16" height="14" rx="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M8 9h8M8 13h5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        </svg>
      );
    case "calendar":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3.5" y="5.5" width="17" height="15" rx="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M7.5 3.8v3.4M16.5 3.8v3.4M3.8 9.5h16.4"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.8"
          />
        </svg>
      );
    case "spark":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3ZM18.3 16.5l.7 2.1 2.1.7-2.1.7-.7 2.1-.7-2.1-2.1-.7 2.1-.7.7-2.1ZM5.7 15l.9 2.5 2.5.9-2.5.9-.9 2.5-.9-2.5-2.5-.9 2.5-.9.9-2.5Z"
            fill="none"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="1.4"
          />
        </svg>
      );
    case "schedule":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 7.8v4.7l3 1.9" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        </svg>
      );
    case "payments":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="6" width="18" height="12" rx="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M3.5 10h17M7 14.5h4.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        </svg>
      );
    case "notifications":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 4.5a4.2 4.2 0 0 1 4.2 4.2v2.1c0 1 .3 2.1.9 2.9l1 1.3H5.9l1-1.3c.6-.8.9-1.9.9-2.9V8.7A4.2 4.2 0 0 1 12 4.5Z"
            fill="none"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
          <path
            d="M10 18c.4 1.1 1 1.7 2 1.7s1.6-.6 2-1.7"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.8"
          />
        </svg>
      );
    case "reviews":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="m12 4.3 2.1 4.3 4.8.7-3.5 3.4.8 4.8L12 15.7l-4.2 2.2.8-4.8-3.5-3.4 4.8-.7L12 4.3Z"
            fill="none"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
      );
    case "dashboard":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M4.5 5.5h6v6h-6ZM13.5 5.5h6v4h-6ZM13.5 12.5h6v6h-6ZM4.5 14.5h6v4h-6Z"
            fill="none"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
      );
    case "network":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="6" cy="8" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="18" cy="8" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="12" cy="17" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M7.8 9.3 10.5 15M16.2 9.3 13.5 15M8.4 8h7.2"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.8"
          />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
  }
}

function SectionHeading({ eyebrow, title, description, center = false, id }) {
  return (
    <div id={id} className={`section-heading ${center ? "section-heading-center" : ""}`}>
      <Reveal as="span" className="eyebrow" y={18}>
        {eyebrow}
      </Reveal>
      <RevealText as="h2" delay={0.06}>
        {title}
      </RevealText>
      {description ? (
        <Reveal as="p" delay={0.16} y={22}>
          {description}
        </Reveal>
      ) : null}
    </div>
  );
}

function PlatformFeatureCard({ feature, index }) {
  return (
    <Reveal className="platform-feature-card" delay={index * 0.05}>
      <div className="icon-bubble icon-bubble-sm">
        <HomeIcon name={feature.icon} />
      </div>
      <div>
        <h3>{feature.title}</h3>
        <p>{feature.text}</p>
      </div>
    </Reveal>
  );
}

function HomeSectionShell({ children, className = "", panelClassName = "" }) {
  return (
    <div className={`home-section-shell ${className}`.trim()}>
      <div className={`home-section-panel ${panelClassName}`.trim()}>{children}</div>
    </div>
  );
}

export default async function HomeLanding() {
  return (
    <main className="home-page">
      <section className="section page-intro home-hero-section">
        <div className="container">
          <Reveal className="hero-banner-reveal" y={26}>
            <HeroBanner />
          </Reveal>
        </div>
      </section>

      <StickySearchBar />

      <section className="section category-home-section">
        <div className="container">
          <HomeSectionShell className="category-section-shell" panelClassName="category-section-panel">
            <CategoryCarousel categories={homeServiceCategories} />
          </HomeSectionShell>
        </div>
      </section>

      <section className="section" id="stylists">
        <div className="container">
          <HomeSectionShell className="featured-stylist-section-shell">
            <SectionHeading
              eyebrow="Featured Stylists"
              title="Top Rated Stylists Near You"
              description="Browse professionals, compare styles, and book with confidence"
              center
            />
            <FeaturedStylistCarousel />
          </HomeSectionShell>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <HomeSectionShell className="process-section-shell">
            <HowItWorksTimeline steps={howItWorks} />
          </HomeSectionShell>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <HomeSectionShell
            className="why-hairforce-section-shell"
            panelClassName="why-hairforce-section-panel"
          >
            <WhyHairForceRail />
          </HomeSectionShell>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <HomeSectionShell
            className="app-preview-section-shell"
            panelClassName="app-preview-section-panel"
          >
            <AppPreviewSection />
          </HomeSectionShell>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <HomeSectionShell
            className="testimonial-section-shell"
            panelClassName="testimonial-section-panel"
          >
            <TestimonialCarousel testimonials={testimonials} />
          </HomeSectionShell>
        </div>
      </section>

      <section className="section" id="faqs">
        <div className="container">
          <HomeSectionShell>
            <div className="faq-two-column-layout">
              <SectionHeading
                eyebrow="FAQs"
                title="Answers for clients and growth-focused vendors"
                description="A few quick answers for the most common marketplace questions before launch."
              />
              <FaqAccordion items={faqs} />
            </div>
          </HomeSectionShell>
        </div>
      </section>

      <section className="section business-promo-home-section">
        <div className="container">
          <HomeSectionShell
            className="business-promo-section-shell"
            panelClassName="business-promo-section-panel"
          >
            <BusinessGrowthPromo />
          </HomeSectionShell>
        </div>
      </section>
    </main>
  );
}
