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
  "Smart Scheduling": "/featured-stylists/fresha-01.jpg",
  "Seamless Payments": "/featured-stylists/fresha-09.jpg",
  "Smart Notifications": "/featured-stylists/fresha-03.jpg",
  "Verified Reviews": "/featured-stylists/fresha-04.jpg",
  "Business Dashboard": "/app-preview/trendy-studio.webp",
  "Grow Your Clients": "/featured-stylists/fresha-08.jpg"
};

const FEATURE_LIVE_LABELS = {
  "Smart Scheduling": "Booking calendar",
  "Seamless Payments": "Checkout flow",
  "Smart Notifications": "Reminder system",
  "Verified Reviews": "Trust signals",
  "Business Dashboard": "Vendor workspace",
  "Grow Your Clients": "Discovery preview"
};

export default function WhyHairForceRail() {
  const features = whyHairForceCards.map((item) => ({
    id: item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    label: item.title,
    description: item.text,
    image: FEATURE_IMAGES[item.title] || "/featured-stylists/fresha-02.jpg",
    icon: ICONS[item.icon] || CalendarClock,
    alt: `${item.title} preview for Hairforce`,
    liveLabel: FEATURE_LIVE_LABELS[item.title] || "Hairforce preview"
  }));

  return (
    <div className="space-y-8">
      <div className="section-heading section-heading-center">
        <span className="eyebrow">Why Hairforce</span>
        <h2>Why choose Hairforce</h2>
        <p>
          Everything you need to book smarter, manage better, and grow faster - all in one
          platform.
        </p>
      </div>

      <FeatureCarousel features={features} />
    </div>
  );
}
