"use client";

import {
  BellRing,
  CalendarClock,
  CreditCard,
  LayoutDashboard,
  Star,
  UsersRound
} from "lucide-react";
import FeatureCarousel from "@/components/ui/feature-carousel";
import { whyHairForceCards } from "@/lib/data";

const ICONS = {
  schedule: CalendarClock,
  payments: CreditCard,
  notifications: BellRing,
  reviews: Star,
  dashboard: LayoutDashboard,
  growth: UsersRound
};

const FEATURE_IMAGES = {
  schedule: "/featured-stylists/fresha-01.jpg",
  payments: "/featured-stylists/fresha-09.jpg",
  notifications: "/featured-stylists/fresha-03.jpg",
  reviews: "/featured-stylists/fresha-04.jpg",
  dashboard: "/app-preview/trendy-studio.webp",
  growth: "/featured-stylists/fresha-08.jpg"
};

const FEATURE_LIVE_LABELS = {
  schedule: "Booking calendar",
  payments: "Checkout flow",
  notifications: "Reminder system",
  reviews: "Trust signals",
  dashboard: "Vendor workspace",
  growth: "Discovery preview"
};

export default function WhyHairForceRail() {
  const features = whyHairForceCards.map((item) => ({
    id: item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    label: item.title,
    description: item.text,
    image: FEATURE_IMAGES[item.icon] || "/featured-stylists/fresha-02.jpg",
    icon: ICONS[item.icon] || CalendarClock,
    alt: `${item.title} preview for Hair Force`,
    liveLabel: FEATURE_LIVE_LABELS[item.icon] || "Hair Force preview"
  }));

  return (
    <div className="space-y-8">
      <div className="section-heading section-heading-center">
        <span className="eyebrow">Why Hair Force</span>
        <h2>Why stylists and clients choose us</h2>
        <p>
          Real-time booking, deposits up front, verified reviews, and a dashboard
          built for the day-to-day of running a salon.
        </p>
      </div>

      <FeatureCarousel features={features} />
    </div>
  );
}
