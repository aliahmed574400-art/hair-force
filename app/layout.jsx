import Footer from "@/components/ui/Footer";
import Navbar from "@/components/ui/Navbar";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import "@/app/globals.css";

export const metadata = {
  title: "Hair Force | Multi-vendor stylist marketplace",
  description:
    "Hair Force is a StyleSeat-inspired multi-vendor beauty marketplace for salons, barbers, spas, and beauty professionals."
};

// General Sans is hosted on Fontshare (not Google Fonts). We preconnect to
// Fontshare's CDN and let CSS @font-face in globals.css declare the families.
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=general-sans@200,300,400,500,600,700&display=swap"
        />
      </head>
      <body>
        <ServiceWorkerRegister />
        <div className="app-shell">
          <div className="site-noise" />
          <Navbar />
          {children}
          <Footer />
        </div>
      </body>
    </html>
  );
}
