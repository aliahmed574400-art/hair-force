"use client";

export default function StylistTabs({ tabs, activeTab, onChange }) {
  return (
    <div
      role="tablist"
      className="-mx-4 flex gap-6 overflow-x-auto border-b border-gray-200 px-4"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`relative shrink-0 pb-3 pt-1 text-sm font-medium transition-colors ${
              isActive
                ? "text-[#2856f8]"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              {tab.label}
              {typeof tab.count === "number" ? (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                    isActive
                      ? "bg-[#2856f8]/10 text-[#2856f8]"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {tab.count}
                </span>
              ) : null}
            </span>
            {isActive ? (
              <span className="absolute -bottom-px left-0 right-0 h-0.5 rounded-full bg-[#2856f8]" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
