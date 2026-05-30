"use client";

import Link from "next/link";

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

const SOCIAL_LABELS = {
  instagram: "Instagram",
  facebook: "Facebook",
  twitter: "Twitter",
  website: "Website",
  yelp: "Yelp",
  tiktok: "TikTok"
};

export default function AboutSection({ stylist }) {
  const personalInfo = stylist.personalInfo || {};
  const businessInfo = stylist.businessInfo || {};
  const aboutText = personalInfo.about || stylist.bio || "";
  const specialties = stylist.specialties || [];
  const amenities = stylist.amenities || [];
  const socials = Object.entries(stylist.socialLinks || {})
    .map(([key, value]) => ({
      key,
      label: SOCIAL_LABELS[key] || key,
      href: buildSocialHref(key, value),
      displayValue: String(value || "").trim()
    }))
    .filter((item) => item.href);

  return (
    <div className="space-y-5">
      {aboutText ? (
        <section>
          <h3 className="text-[13px] font-bold uppercase tracking-wider text-gray-900">
            About
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">{aboutText}</p>
        </section>
      ) : null}

      {specialties.length ? (
        <section>
          <h3 className="text-[13px] font-bold uppercase tracking-wider text-gray-900">
            Specialties
          </h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {specialties.map((item) => (
              <span
                key={item}
                className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
              >
                {item}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {amenities.length ? (
        <section>
          <h3 className="text-[13px] font-bold uppercase tracking-wider text-gray-900">
            Amenities
          </h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {amenities.map((item) => (
              <span
                key={item}
                className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
              >
                {item}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {businessInfo.businessName ? (
        <section>
          <h3 className="text-[13px] font-bold uppercase tracking-wider text-gray-900">
            Business
          </h3>
          <p className="mt-2 text-sm text-gray-600">{businessInfo.businessName}</p>
        </section>
      ) : null}

      {socials.length ? (
        <section>
          <h3 className="text-[13px] font-bold uppercase tracking-wider text-gray-900">
            Find online
          </h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {socials.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700 hover:border-[#2856f8] hover:text-[#2856f8]"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
