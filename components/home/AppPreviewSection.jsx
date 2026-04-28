import Reveal from "@/components/animated/Reveal";
import SiteButton from "@/components/ui/SiteButton";

export default function AppPreviewSection() {
  return (
    <div className="app-preview-grid">
      <Reveal className="app-preview-copy" y={22}>
        <span className="eyebrow">App Preview</span>
        <h2>Manage Everything — Right From Your Device</h2>
        <p>
          Book appointments, track clients, and grow your business — all in one powerful
          platform.
        </p>

        <div className="app-preview-actions">
          <SiteButton href="#faqs">Explore Features</SiteButton>
          <SiteButton href="/join" variant="secondary">
            Get Started
          </SiteButton>
        </div>
      </Reveal>

      <Reveal className="app-preview-device-zone" delay={0.12} y={28}>
        <div className="app-preview-shadow" aria-hidden="true" />

        <div className="app-preview-floating">
          <div className="app-preview-media-grid">
            <div className="app-preview-phone app-preview-phone-primary">
              <div className="app-preview-phone-screen-media">
                <img
                  src="/app-preview/trendy-studio.webp"
                  alt="Trendy Studio preview"
                  className="app-preview-phone-image app-preview-phone-image-primary"
                />
              </div>
            </div>

            <div className="app-preview-phone app-preview-phone-secondary">
              <div className="app-preview-phone-screen-media">
                <video
                  className="app-preview-phone-video app-preview-phone-video-secondary"
                  src="/app-preview/mobile-preview.mp4"
                  poster="/app-preview/trendy-studio.webp"
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
