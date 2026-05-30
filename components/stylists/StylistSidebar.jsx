"use client";

import { MapPin, Globe } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const DAY_NAMES_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
];

function formatTimeHm(value) {
  const [h, m] = String(value || "").split(":").map(Number);
  if (!Number.isFinite(h)) return "";
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m || 0).padStart(2, "0")} ${period}`;
}

function buildHoursRows(rules = []) {
  const buckets = new Map();
  rules.forEach((rule) => {
    if (rule.active === false) return;
    const day = DAY_NAMES_LONG[rule.dayOfWeek];
    const range = `${formatTimeHm(rule.startTime)} - ${formatTimeHm(rule.endTime)}`;
    if (!day) return;
    if (!buckets.has(day)) buckets.set(day, range);
  });
  return DAY_NAMES_LONG.map((day) => ({
    day,
    time: buckets.get(day) || "Closed"
  }));
}

function SidebarCard({ title, children }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-900">
        {title}
      </h3>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function buildSocialHref(key, value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  const username = raw.replace(/^@/, "");
  if (key === "instagram") return `https://instagram.com/${username}`;
  if (key === "twitter") return `https://twitter.com/${username}`;
  if (key === "tiktok") return `https://www.tiktok.com/@${username}`;
  return `https://${raw}`;
}

function InstagramIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

function FacebookIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function TwitterIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function TikTokIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  );
}

function YelpIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.687 14.408a.592.592 0 01-.17.47l-3.6 4.22c-.18.206-.434.325-.703.325-.269 0-.523-.119-.703-.325l-3.6-4.22a.596.596 0 01-.17-.47l.82-5.08a.59.59 0 01.84-.44l4.69 1.9a.585.585 0 01.35.44l.65 3.08zm3.55-3.13l4.69-1.9a.59.59 0 01.84.44l.82 5.08a.596.596 0 01-.17.47l-3.6 4.22a.878.878 0 01-.703.325.878.878 0 01-.703-.325l-3.6-4.22a.592.592 0 01-.17-.47l.65-3.08a.585.585 0 01.35-.44l.65-.03zm-8.13-3.34L8.7 4.18a.59.59 0 01.84-.44l5.08.82a.596.596 0 01.47.17l4.22 3.6c.206.18.325.434.325.703 0 .269-.119.523-.325.703l-4.22 3.6a.592.592 0 01-.47.17l-3.08-.65a.585.585 0 01-.44-.35l-1.9-4.69a.59.59 0 01.44-.84zm10.66 1.9l1.9-4.69a.59.59 0 01.84-.44l5.08.82c.206.033.39.14.52.29l3.6 4.22c.18.206.28.476.28.76 0 .284-.1.554-.28.76l-3.6 4.22a.878.878 0 01-.52.29l-5.08.82a.59.59 0 01-.84-.44l-1.9-4.69a.585.585 0 01.03-.65z" />
    </svg>
  );
}

const SOCIAL_CONFIG = {
  instagram: { label: "Instagram", Icon: InstagramIcon, color: "hover:text-pink-600 hover:bg-pink-50 hover:border-pink-200" },
  facebook: { label: "Facebook", Icon: FacebookIcon, color: "hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200" },
  twitter: { label: "Twitter", Icon: TwitterIcon, color: "hover:text-gray-900 hover:bg-gray-100 hover:border-gray-300" },
  tiktok: { label: "TikTok", Icon: TikTokIcon, color: "hover:text-black hover:bg-gray-100 hover:border-gray-300" },
  website: { label: "Website", Icon: Globe, color: "hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200" },
  yelp: { label: "Yelp", Icon: YelpIcon, color: "hover:text-red-600 hover:bg-red-50 hover:border-red-200" }
};

function SocialLinks({ socialLinks }) {
  const links = Object.entries(socialLinks || {})
    .map(([key, value]) => ({
      key,
      href: buildSocialHref(key, value),
      value: String(value || "").trim()
    }))
    .filter((item) => item.href);

  if (!links.length) return null;

  return (
    <SidebarCard title="Social">
      <div className="flex flex-wrap gap-2">
        {links.map((link) => {
          const config = SOCIAL_CONFIG[link.key];
          if (!config) return null;
          const Icon = config.Icon;
          return (
            <a
              key={link.key}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              aria-label={config.label}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-colors duration-200 ${config.color}`}
            >
              <Icon className="h-[18px] w-[18px]" />
            </a>
          );
        })}
      </div>
    </SidebarCard>
  );
}

export default function StylistSidebar({ stylist }) {
  const hours = buildHoursRows(stylist.availabilityRules || []);
  const businessInfo = stylist.businessInfo || {};
  const personalInfo = stylist.personalInfo || {};
  const policies = stylist.policies || {};
  const address = [
    businessInfo.streetAddress,
    businessInfo.suite,
    businessInfo.city,
    businessInfo.state,
    businessInfo.zip
  ]
    .filter(Boolean)
    .join(", ");
  const stats = stylist.metrics || {};
  const aboutText = personalInfo.about || stylist.bio || "";

  return (
    <div className="sticky top-4 space-y-3">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="relative h-32 bg-gradient-to-br from-[#dbe7ff] via-[#f1f5fe] to-white">
          <div className="absolute inset-0 opacity-60 [background-image:radial-gradient(circle_at_25%_30%,rgba(40,86,248,0.16),transparent_55%),radial-gradient(circle_at_75%_70%,rgba(96,165,250,0.22),transparent_60%)]" />
          <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/85 px-2 py-1 text-[11px] font-medium text-[#2856f8] shadow-sm">
            <MapPin size={11} strokeWidth={2} aria-hidden="true" />
            {stylist.area || stylist.city || "Map"}
          </div>
        </div>
        <div className="p-3">
          <p className="text-sm font-medium text-gray-900">
            {address || stylist.location || "Location on file with the stylist"}
          </p>
          {stylist.city || stylist.state ? (
            <p className="mt-0.5 text-xs text-gray-500">
              {[stylist.city, stylist.state].filter(Boolean).join(", ")}
            </p>
          ) : null}
        </div>
      </div>

      <SidebarCard title="Hours of Operation">
        <div className="space-y-1">
          {hours.map(({ day, time }) => (
            <div key={day} className="flex items-center justify-between text-xs">
              <span className="text-gray-600">{day}</span>
              <span
                className={
                  time === "Closed" ? "text-gray-400" : "text-gray-900 font-medium"
                }
              >
                {time}
              </span>
            </div>
          ))}
        </div>
      </SidebarCard>

      {aboutText ? (
        <SidebarCard title="About the Business">
          <p className="text-xs leading-relaxed text-gray-600">{aboutText}</p>
        </SidebarCard>
      ) : null}

      <SocialLinks socialLinks={stylist.socialLinks} />

      {policies.cancellation ? (
        <SidebarCard title="Cancellation Policy">
          <p className="text-xs leading-relaxed text-gray-600">{policies.cancellation}</p>
        </SidebarCard>
      ) : null}

      {policies.deposit ? (
        <SidebarCard title="Deposit Policy">
          <p className="text-xs leading-relaxed text-gray-600">{policies.deposit}</p>
        </SidebarCard>
      ) : null}

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-gray-50 p-2 text-center">
          <div className="text-sm font-semibold tracking-tight text-gray-900">
            {formatCurrency(stylist.priceFrom || 0)}
          </div>
          <div className="text-[10px] uppercase tracking-wide text-gray-500">
            starting
          </div>
        </div>
        <div className="rounded-lg bg-gray-50 p-2 text-center">
          <div className="text-sm font-semibold tracking-tight text-gray-900">
            {stats.repeatClients || "—"}
          </div>
          <div className="text-[10px] uppercase tracking-wide text-gray-500">
            repeat
          </div>
        </div>
        <div className="rounded-lg bg-gray-50 p-2 text-center">
          <div className="text-sm font-semibold tracking-tight text-gray-900">
            {stats.showUpRate || "—"}
          </div>
          <div className="text-[10px] uppercase tracking-wide text-gray-500">
            show-up
          </div>
        </div>
      </div>
    </div>
  );
}
