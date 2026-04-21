import { Manrope, Sora } from "next/font/google";
import Footer from "@/components/ui/Footer";
import FloatingBot from "@/components/ui/FloatingBot";
import Navbar from "@/components/ui/Navbar";
import "@/app/globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-body"
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-display"
});

export const metadata = {
  title: "Hair Force | Multi-vendor stylist marketplace",
  description:
    "Hair Force is a StyleSeat-inspired multi-vendor beauty marketplace for salons, barbers, spas, and beauty professionals."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${sora.variable}`}>
        <div className="app-shell">
          <div className="site-noise" />
          <Navbar />
          {children}
          <Footer />
          <FloatingBot />
        </div>
      </body>
    </html>
  );
}
