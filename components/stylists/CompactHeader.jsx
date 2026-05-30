"use client";

import { Heart, Share2, MessageCircle } from "lucide-react";

function getInitials(name) {
  return String(name || "HF")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function buildRoleLine(stylist) {
  const businessInfo = stylist.businessInfo || {};
  const personalInfo = stylist.personalInfo || {};
  const role = personalInfo.profession || stylist.category || "Stylist";
  const businessName = businessInfo.businessName || stylist.tagline;
  if (businessName) return `${role} at ${businessName}`;
  return role;
}

export default function CompactHeader({
  stylist,
  onLike,
  onShare,
  onMessage,
  liked = false,
  showMessage = false
}) {
  const roleLine = buildRoleLine(stylist);

  return (
    <header className="flex items-center justify-between gap-4 pt-8 pb-6">
      <div className="flex min-w-0 items-center gap-4">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-[#2856f8] to-[#54b6ff] text-white shadow-[0_10px_24px_rgba(40,86,248,0.32)]">
          {stylist.avatar ? (
            <img
              src={stylist.avatar}
              alt={`${stylist.name} profile`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xl font-medium tracking-tight">
              {getInitials(stylist.name)}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <h1 className="truncate text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            {stylist.name}
          </h1>
          <p className="mt-0.5 truncate text-sm text-gray-500 sm:text-base">
            {roleLine}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {showMessage ? (
          <button
            type="button"
            onClick={onMessage}
            aria-label="Message stylist"
            className="flex h-10 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:text-[#0070f3]"
          >
            <MessageCircle size={16} strokeWidth={2} aria-hidden="true" />
            <span className="hidden sm:inline">Message</span>
          </button>
        ) : null}
        <button
          type="button"
          onClick={onLike}
          aria-pressed={liked}
          aria-label={liked ? "Unsave stylist" : "Save stylist"}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition hover:border-gray-300 hover:text-rose-500"
        >
          <Heart
            size={18}
            strokeWidth={2}
            className={liked ? "fill-rose-500 text-rose-500" : ""}
            aria-hidden="true"
          />
        </button>
        <button
          type="button"
          onClick={onShare}
          aria-label="Share stylist profile"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition hover:border-gray-300 hover:text-gray-900"
        >
          <Share2 size={18} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
