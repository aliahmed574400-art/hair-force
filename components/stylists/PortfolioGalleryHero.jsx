"use client";

import { Grid3x3 } from "lucide-react";

function GalleryTile({ item, className = "", onClick, isShowAll, showAllCount }) {
  if (!item) {
    return (
      <div
        className={`relative overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 ${className}`}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative overflow-hidden bg-gray-100 ${className}`}
    >
      {item.type === "video" ? (
        <video
          src={item.url}
          muted
          playsInline
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
      ) : (
        <img
          src={item.url}
          alt={item.caption || ""}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
      )}
      <span className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-200 group-hover:bg-black/10" />
      {isShowAll ? (
        <span className="pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-gray-900 shadow-sm ring-1 ring-gray-200">
          <Grid3x3 size={13} strokeWidth={2} aria-hidden="true" />
          Show All Photos{showAllCount ? ` (${showAllCount})` : ""}
        </span>
      ) : null}
    </button>
  );
}

export default function PortfolioGalleryHero({ items = [], onShowAll, onSelect }) {
  if (!items.length) {
    return null;
  }

  const handleTileClick = (index) => () => {
    if (onSelect) onSelect(index);
    else if (onShowAll) onShowAll();
  };

  const total = items.length;
  const visible = items.slice(0, 4);
  const count = visible.length;

  const gridColsClass =
    count === 1
      ? "md:grid-cols-1"
      : count === 2
        ? "md:grid-cols-2"
        : "md:grid-cols-[2fr_2fr_1fr]";

  return (
    <section>
      {/* Desktop: fixed height hero with up to 4 images */}
      <div
        className={`hidden h-[460px] gap-2 overflow-hidden rounded-2xl md:grid md:grid-rows-2 ${gridColsClass}`}
      >
        <GalleryTile
          item={visible[0]}
          className={
            count > 1 ? "row-span-2 rounded-l-2xl" : "row-span-2 rounded-2xl"
          }
          onClick={handleTileClick(0)}
        />

        {count >= 2 && (
          <GalleryTile
            item={visible[1]}
            className={`row-span-2 ${count === 2 ? "rounded-r-2xl" : ""}`}
            onClick={handleTileClick(1)}
          />
        )}

        {count >= 3 && (
          <GalleryTile
            item={visible[2]}
            className="rounded-tr-2xl"
            onClick={handleTileClick(2)}
          />
        )}

        {count >= 3 &&
          (count >= 4 ? (
            <GalleryTile
              item={visible[3]}
              className="rounded-br-2xl"
              onClick={onShowAll || handleTileClick(3)}
              isShowAll={Boolean(onShowAll) && total > 4}
              showAllCount={total}
            />
          ) : (
            <div className="rounded-br-2xl bg-gradient-to-br from-gray-100 to-gray-200" />
          ))}
      </div>

      {/* Mobile: single hero with View-all overlay */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl md:hidden">
        <GalleryTile
          item={items[0]}
          className="h-full w-full"
          onClick={onShowAll || handleTileClick(0)}
          isShowAll={Boolean(onShowAll)}
          showAllCount={total}
        />
      </div>
    </section>
  );
}
