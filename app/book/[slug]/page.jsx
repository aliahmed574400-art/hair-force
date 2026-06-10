import { notFound } from "next/navigation";
import BookingForm from "@/components/ui/BookingForm";
import { buildVendorCityStateLabel } from "@/lib/discovery";
import { getStylistBySlug } from "@/lib/postgres-repositories";
import { formatCurrency } from "@/lib/utils";
import { Star, MapPin, Scissors } from "lucide-react";

export default async function BookingPage({ params, searchParams }) {
  const stylist = await getStylistBySlug(params.slug);

  if (!stylist) {
    notFound();
  }

  const mainService = stylist.services?.[0];

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(239,246,255,0.92) 40%, rgba(255,255,255,0.98) 100%)",
        padding: "32px 18px 80px",
      }}
    >
      <div
        style={{
          maxWidth: "720px",
          margin: "0 auto",
          display: "grid",
          gap: "20px",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "4px",
          }}
        >
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "rgba(37,99,235,0.85)",
            }}
          >
            Book Appointment
          </span>
        </div>

        {/* Stylist Info Card */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "72px 1fr auto",
            gap: "16px",
            alignItems: "center",
            padding: "20px 22px",
            borderRadius: "24px",
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.96), rgba(242,247,255,0.92))",
            border: "1px solid rgba(214,228,255,0.92)",
            boxShadow: "0 4px 20px rgba(2,8,23,0.04)",
          }}
        >
          {stylist.avatar || stylist.coverImage ? (
            <img
              src={stylist.avatar || stylist.coverImage}
              alt={stylist.name}
              style={{
                width: 72,
                height: 72,
                borderRadius: "18px",
                objectFit: "cover",
                background:
                  "linear-gradient(135deg, rgba(191,219,254,0.42), rgba(224,242,254,0.82))",
              }}
            />
          ) : (
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "18px",
                background:
                  "linear-gradient(135deg, rgba(191,219,254,0.42), rgba(224,242,254,0.82))",
                display: "grid",
                placeItems: "center",
                color: "#173064",
                fontSize: "1.25rem",
                fontWeight: 700,
              }}
            >
              {String(stylist.name || "HF")
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((p) => p.charAt(0).toUpperCase())
                .join("")}
            </div>
          )}

          <div style={{ minWidth: 0 }}>
            <h1
              style={{
                margin: 0,
                fontSize: "1.35rem",
                fontWeight: 600,
                color: "#0f172a",
                letterSpacing: "-0.02em",
                lineHeight: 1.2,
                fontFamily: "var(--font-display), sans-serif",
              }}
            >
              {stylist.name}
            </h1>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginTop: "6px",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "0.82rem",
                  color: "#64748b",
                }}
              >
                <MapPin size={13} />
                {buildVendorCityStateLabel(stylist)}
              </span>
              {stylist.rating ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "0.82rem",
                    color: "#f59e0b",
                    fontWeight: 500,
                  }}
                >
                  <Star size={13} fill="currentColor" />
                  {Number(stylist.rating).toFixed(1)}
                </span>
              ) : null}
              {stylist.category ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "0.82rem",
                    color: "#64748b",
                  }}
                >
                  <Scissors size={13} />
                  {stylist.category}
                </span>
              ) : null}
            </div>
          </div>

          {mainService ? (
            <div style={{ textAlign: "right" }}>
              <span
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  color: "#0f172a",
                  letterSpacing: "-0.01em",
                }}
              >
                {formatCurrency(mainService.price)}
              </span>
              <span
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  color: "#94a3b8",
                  marginTop: "2px",
                }}
              >
                from
              </span>
            </div>
          ) : null}
        </div>

        {/* Booking Form */}
        <BookingForm
          vendor={stylist}
          initialSelection={{
            serviceId: searchParams?.service || "",
            date: searchParams?.date || "",
            slot: searchParams?.slot || "",
          }}
        />
      </div>
    </main>
  );
}
