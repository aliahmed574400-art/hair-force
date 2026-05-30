"use client";

import { useMemo } from "react";
import { calculateDeposit, formatCurrency } from "@/lib/utils";

function ServiceRow({ service, onBook }) {
  const deposit = calculateDeposit(service, service.price);
  const isApproval = service.bookingMethod === "approval";

  return (
    <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-2 py-3 transition-colors hover:bg-gray-50">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {service.imageUrl ? (
          <img
            src={service.imageUrl}
            alt=""
            className="h-12 w-12 shrink-0 rounded-md object-cover"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold tracking-tight text-gray-900">
            {service.title}
          </h3>
          <p className="mt-0.5 text-xs text-gray-500">
            <span>{service.duration}</span>
            {service.description ? (
              <>
                <span className="mx-1.5 text-gray-300">·</span>
                <span className="line-clamp-1">{service.description}</span>
              </>
            ) : null}
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {deposit ? (
              <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-[#2856f8]">
                Deposit {formatCurrency(deposit)}
              </span>
            ) : null}
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                isApproval
                  ? "bg-amber-50 text-amber-700"
                  : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {isApproval ? "Request to book" : "Instant booking"}
            </span>
            {service.featured ? (
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                Featured
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="ml-2 flex shrink-0 items-center gap-3">
        <div className="text-right">
          <div className="text-sm font-semibold tracking-tight text-gray-900">
            {formatCurrency(service.price)}
            {service.metadata?.priceIsStartingAt ? "+" : ""}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onBook(service)}
          className="rounded-md bg-gray-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-black"
        >
          Book
        </button>
      </div>
    </div>
  );
}

export default function ServiceList({ stylist, services, addOns = [], onBook }) {
  const serviceCategories = stylist.serviceCategories || [];

  const groups = useMemo(() => {
    if (!serviceCategories.length) {
      return [
        {
          id: "all",
          title: "Services",
          services
        }
      ];
    }

    const defaultGroup = {
      id: "_default",
      title: "Services",
      services: services.filter((service) => !service.parentCategoryId)
    };

    const categoryGroups = serviceCategories.map((category) => ({
      id: category.id || category.title,
      title: category.title,
      services: services.filter(
        (service) =>
          String(service.parentCategoryId || "") === String(category.id || category.title)
      )
    }));

    return [defaultGroup, ...categoryGroups].filter((group) => group.services.length);
  }, [serviceCategories, services]);

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.id}>
          <h2 className="border-b-2 border-gray-900 pb-1.5 text-[13px] font-bold uppercase tracking-wider text-gray-900">
            {group.title}
            <span className="ml-2 text-[11px] font-medium text-gray-400">
              {group.services.length}
            </span>
          </h2>
          <div>
            {group.services.map((service) => (
              <ServiceRow key={service.id} service={service} onBook={onBook} />
            ))}
          </div>
        </section>
      ))}

      {addOns.length ? (
        <section>
          <h2 className="border-b-2 border-gray-900 pb-1.5 text-[13px] font-bold uppercase tracking-wider text-gray-900">
            Add-ons
            <span className="ml-2 text-[11px] font-medium text-gray-400">
              {addOns.length}
            </span>
          </h2>
          <div>
            {addOns.map((addon) => (
              <div
                key={addon.id}
                className="flex items-start justify-between gap-3 border-b border-gray-100 px-2 py-3"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold tracking-tight text-gray-900">
                    {addon.title}
                  </h3>
                  <p className="mt-0.5 text-xs text-gray-500">
                    <span>{addon.duration}</span>
                    {addon.description ? (
                      <>
                        <span className="mx-1.5 text-gray-300">·</span>
                        <span className="line-clamp-1">{addon.description}</span>
                      </>
                    ) : null}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                      {addon.metadata?.timeAdded === "before"
                        ? "Before base service"
                        : "After base service"}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold tracking-tight text-gray-900">
                    +{formatCurrency(addon.price)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
