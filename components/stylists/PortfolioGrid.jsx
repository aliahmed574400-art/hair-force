"use client";

export default function PortfolioGrid({ items = [], stylistName = "", onSelect }) {
  if (!items.length) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
        <p className="text-sm text-gray-500">
          Portfolio photos will appear here as the stylist adds real work samples
          from their dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {items.map((item, index) => (
        <button
          key={`${item.url}-${index}`}
          type="button"
          onClick={() => onSelect?.(index)}
          className="group relative aspect-[4/5] overflow-hidden rounded-lg bg-gray-100"
          aria-label={item.caption || `${stylistName} portfolio ${index + 1}`}
        >
          {item.type === "video" ? (
            <video
              src={item.url}
              muted
              playsInline
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
            />
          ) : (
            <img
              src={item.url}
              alt={item.caption || `${stylistName} portfolio ${index + 1}`}
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
            />
          )}
          {item.caption ? (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-left text-[11px] font-medium text-white">
              {item.caption}
            </div>
          ) : null}
        </button>
      ))}
    </div>
  );
}
