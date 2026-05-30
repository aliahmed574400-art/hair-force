import VendorAuthShell from "@/components/ui/VendorAuthShell";
import VendorSignupForm from "@/components/vendor/VendorSignupForm";
import { getVendorSigninHeroSlides } from "@/lib/vendor-signin-hero";

export default async function VendorSignupPage() {
  const vendorHeroSlides = await getVendorSigninHeroSlides();

  return (
    <main className="page-intro">
      <VendorAuthShell slides={vendorHeroSlides}>
        <VendorSignupForm />
      </VendorAuthShell>
    </main>
  );
}
