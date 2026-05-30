import Reveal from "@/components/animated/Reveal";
import RevealText from "@/components/animated/RevealText";
import AppPreviewSection from "@/components/home/AppPreviewSection";
import BeforeAfterGallery from "@/components/home/BeforeAfterGallery";
import BusinessGrowthPromo from "@/components/home/BusinessGrowthPromo";
import CategoryCarousel from "@/components/home/CategoryCarousel";
import FaqAccordion from "@/components/home/FaqAccordion";
import FeaturedStylistCarousel from "@/components/home/FeaturedStylistCarousel";
import HeroBanner from "@/components/home/HeroBanner";
import HowItWorksTimeline from "@/components/home/HowItWorksTimeline";
import TestimonialCarousel from "@/components/home/TestimonialCarousel";
import WhyHairForceRail from "@/components/home/WhyHairForceRail";
import {
  faqs,
  homeServiceCategories,
  howItWorks,
  testimonials
} from "@/lib/data";
import { getFeaturedStylists } from "@/lib/postgres-repositories";

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

function HomeSectionShell({ children, className = "", panelClassName = "" }) {
  return (
    <div className={`home-section-shell ${className}`.trim()}>
      <div className={`home-section-panel ${panelClassName}`.trim()}>{children}</div>
    </div>
  );
}

export default async function HomeLanding() {
  let featuredStylists = [];
  try {
    featuredStylists = await getFeaturedStylists();
  } catch (error) {
    console.error("Failed to load featured stylists for landing page:", error);
  }

  return (
    <main className="home-page">
      <section className="section page-intro home-hero-section">
        <div className="container">
          <Reveal className="hero-banner-reveal" y={26}>
            <HeroBanner />
          </Reveal>
        </div>
      </section>

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
              eyebrow="Featured"
              title="Stylists booking this week"
              description="Real portfolios, verified reviews, live availability. Pick someone and lock in your slot."
              center
            />
            <FeaturedStylistCarousel stylists={featuredStylists} />
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

      <section className="section before-after-section">
        <div className="container">
          <HomeSectionShell className="before-after-section-shell" panelClassName="before-after-section-panel">
            <BeforeAfterGallery />
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
                eyebrow="FAQ"
                title="Questions before you book"
                description="Quick answers for clients and stylists."
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
