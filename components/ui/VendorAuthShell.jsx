import VendorSigninHeroSlider from "@/components/ui/vendor-signin-hero-slider";

export default function VendorAuthShell({ slides, children }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.08fr_0.92fr]">
      {/* Left column — carousel */}
      <div className="relative hidden overflow-hidden text-primary-foreground lg:flex lg:flex-col h-screen bg-[#081327]">
        <div className="relative z-20 space-y-8">
          <VendorSigninHeroSlider slides={slides} />
        </div>
      </div>

      {/* Right column — form */}
      <div className="flex min-h-screen bg-background lg:min-h-full">
        <div className="flex min-h-full w-full flex-col justify-between px-6 py-6 sm:px-10 sm:py-8">
          {children}
        </div>
      </div>
    </div>
  );
}
