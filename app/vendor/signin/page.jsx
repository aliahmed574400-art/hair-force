import AnimatedCharactersLoginPage from "@/components/ui/animated-characters-login-page";
import { getVendorSigninHeroSlides } from "@/lib/vendor-signin-hero";

export default async function VendorSigninPage() {
  const vendorHeroSlides = await getVendorSigninHeroSlides();

  return (
    <main className="page-intro">
      <AnimatedCharactersLoginPage audience="vendor" vendorHeroSlides={vendorHeroSlides} />
    </main>
  );
}
