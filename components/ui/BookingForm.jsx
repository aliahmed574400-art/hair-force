"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronDown, Clock, Scissors, ShieldCheck, Sparkles, User } from "lucide-react";
import StripeDepositCheckout from "@/components/ui/StripeDepositCheckout";
import SiteButton from "@/components/ui/SiteButton";
import { calculateDeposit, formatCurrency } from "@/lib/utils";

/* ─── design tokens ─── */
const t = {
  bgCard:
    "linear-gradient(135deg, rgba(255,255,255,0.96), rgba(242,247,255,0.92))",
  border: "1px solid rgba(214,228,255,0.92)",
  radiusLg: "24px",
  radiusMd: "16px",
  radiusSm: "12px",
  textPrimary: "#0f172a",
  textSecondary: "#475569",
  textMuted: "#64748b",
  textTertiary: "#94a3b8",
  accent: "#2563eb",
  accentSoft: "rgba(37,99,235,0.08)",
  shadow: "0 4px 20px rgba(2,8,23,0.04)",
  chipBg: "rgba(241,245,249,0.8)",
};

export default function BookingForm({ vendor, initialSelection = {} }) {
  const services = vendor.services || [];
  const [serviceId, setServiceId] = useState(
    services.some((s) => String(s.id) === String(initialSelection.serviceId || ""))
      ? String(initialSelection.serviceId)
      : String(services[0]?.id || "")
  );
  const [availability, setAvailability] = useState({ loading: false, error: "", windows: [] });
  const [windowDate, setWindowDate] = useState(String(initialSelection.date || ""));
  const [slot, setSlot] = useState(String(initialSelection.slot || ""));
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" });
  const [payDepositNow, setPayDepositNow] = useState(true);
  const [checkout, setCheckout] = useState(null);
  const [status, setStatus] = useState({ loading: false, message: "", booking: null });

  const selectedService =
    services.find((s) => String(s.id) === String(serviceId)) || services[0] || null;
  const selectedWindow =
    availability.windows.find((w) => w.date === windowDate) || availability.windows[0] || null;
  const depositAmount = useMemo(
    () => calculateDeposit(selectedService, selectedService?.price),
    [selectedService]
  );
  const isApprovalBooking = selectedService?.bookingMethod === "approval";

  /* hydrate user from session */
  useEffect(() => {
    async function hydrate() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.user) {
          setForm((c) => ({
            ...c,
            name: c.name || data.user.name || "",
            email: c.email || data.user.email || "",
            phone: c.phone || data.user.phone || "",
          }));
        }
      } catch {
        /* ignore */
      }
    }
    hydrate();
  }, []);

  /* load availability whenever service changes */
  useEffect(() => {
    if (!selectedService?.id) return undefined;
    let cancelled = false;

    async function load() {
      setAvailability({ loading: true, error: "", windows: [] });
      try {
        const res = await fetch(
          `/api/stylists/${vendor.slug}/availability?serviceId=${selectedService.id}&maxWindows=12`
        );
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error || "Unable to load available times.");

        const windows = data.windows || [];
        const preferredWindow =
          String(initialSelection.serviceId || "") === String(selectedService.id)
            ? windows.find((w) => w.date === String(initialSelection.date || ""))
            : null;
        const nextWindow = preferredWindow || windows[0] || null;
        const preferredSlot =
          nextWindow?.slots.includes(String(initialSelection.slot || "")) && preferredWindow
            ? String(initialSelection.slot)
            : nextWindow?.slots?.[0] || "";

        setAvailability({ loading: false, error: "", windows });
        setWindowDate(nextWindow?.date || "");
        setSlot(preferredSlot);
      } catch (err) {
        if (cancelled) return;
        setAvailability({ loading: false, error: err.message, windows: [] });
        setWindowDate("");
        setSlot("");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [initialSelection.date, initialSelection.serviceId, initialSelection.slot, selectedService, vendor.slug]);

  async function finalizeBooking(paymentDetails = {}) {
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vendorSlug: vendor.slug,
        serviceId: selectedService.id,
        serviceName: selectedService.title,
        appointmentDate: selectedWindow.date,
        appointmentSlot: slot,
        customerName: form.name,
        customerEmail: form.email,
        customerPhone: form.phone,
        notes: form.notes,
        total: selectedService.price,
        depositAmount: paymentDetails.depositAmount,
        paymentStatus: paymentDetails.paymentStatus,
        paymentIntentId: paymentDetails.paymentIntentId,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Unable to create booking.");
    return data.booking;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!selectedService || !selectedWindow || !slot) {
      setStatus({ loading: false, message: "Choose a service, date, and time first.", booking: null });
      return;
    }
    setStatus({ loading: true, message: "", booking: null });

    try {
      if (isApprovalBooking) {
        const booking = await finalizeBooking({ depositAmount, paymentStatus: "pay_later" });
        setStatus({
          loading: false,
          message:
            "Booking request sent. The stylist will review the time from their dashboard before it is confirmed.",
          booking,
        });
        setCheckout(null);
        return;
      }

      let paymentIntentId = "";
      let paymentStatus =
        depositAmount && payDepositNow ? "deposit_paid" : depositAmount ? "deposit_due" : "pay_later";

      if (depositAmount && payDepositNow) {
        const checkoutRes = await fetch("/api/payments/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: depositAmount,
            serviceName: selectedService.title,
            vendorSlug: vendor.slug,
          }),
        });
        const checkoutData = await checkoutRes.json();
        if (!checkoutRes.ok) throw new Error(checkoutData.error || "Unable to initialize checkout.");

        if (checkoutData.checkout.provider === "stripe" && checkoutData.checkout.clientSecret) {
          setCheckout({
            clientSecret: checkoutData.checkout.clientSecret,
            paymentIntentId: checkoutData.checkout.paymentIntentId,
            amount: depositAmount,
          });
          setStatus({
            loading: false,
            message: "Payment intent created. Complete the deposit form below to finish the booking.",
            booking: null,
          });
          return;
        }

        paymentIntentId = checkoutData.checkout.paymentIntentId;
        paymentStatus = checkoutData.checkout.status;
      }

      const booking = await finalizeBooking({
        depositAmount: payDepositNow ? depositAmount : depositAmount,
        paymentStatus,
        paymentIntentId,
      });

      setStatus({
        loading: false,
        message:
          paymentStatus === "deposit_paid"
            ? "Appointment confirmed and your deposit flow completed successfully."
            : "Appointment confirmed. Your booking is reserved and payment is marked for later.",
        booking,
      });
      setCheckout(null);
    } catch (err) {
      setStatus({ loading: false, message: err.message, booking: null });
    }
  }

  async function handleStripePaid(paymentIntent) {
    try {
      const booking = await finalizeBooking({
        depositAmount,
        paymentStatus: paymentIntent.status || "deposit_paid",
        paymentIntentId: paymentIntent.id || checkout?.paymentIntentId,
      });
      setCheckout(null);
      setStatus({
        loading: false,
        message: "Appointment confirmed and your Stripe deposit was captured successfully.",
        booking,
      });
    } catch (err) {
      setStatus({ loading: false, message: err.message, booking: null });
    }
  }

  /* ─── styles ─── */
  const cardStyle = {
    padding: "22px",
    borderRadius: t.radiusLg,
    background: t.bgCard,
    border: t.border,
    boxShadow: t.shadow,
  };

  const labelStyle = {
    display: "block",
    fontSize: "0.78rem",
    fontWeight: 600,
    color: t.textMuted,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: "8px",
  };

  const inputStyle = {
    width: "100%",
    height: "44px",
    padding: "0 14px",
    borderRadius: t.radiusSm,
    border: "1px solid #e2e8f0",
    background: "#fff",
    color: t.textPrimary,
    fontSize: "0.92rem",
    outline: "none",
    transition: "border 0.2s, box-shadow 0.2s",
    boxSizing: "border-box",
  };

  const textareaStyle = {
    ...inputStyle,
    height: "auto",
    padding: "12px 14px",
    minHeight: "90px",
    resize: "vertical",
    fontFamily: "inherit",
  };

  const selectStyle = {
    width: "100%",
    height: "44px",
    padding: "0 14px",
    borderRadius: t.radiusSm,
    border: "1px solid #e2e8f0",
    background: "#fff",
    color: t.textPrimary,
    fontSize: "0.92rem",
    outline: "none",
    cursor: "pointer",
    appearance: "none",
    backgroundImage:
      "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"%2364748b\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polyline points=\"6 9 12 15 18 9\"></polyline></svg>')",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 12px center",
    paddingRight: "36px",
  };

  return (
    <div style={{ display: "grid", gap: "16px" }}>
      {/* ── Selected Service Summary ── */}
      <div style={cardStyle}>
        <span style={labelStyle}>Selected Service</span>
        {selectedService ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "12px",
                  background: t.accentSoft,
                  display: "grid",
                  placeItems: "center",
                  color: t.accent,
                  flexShrink: 0,
                }}
              >
                <Scissors size={20} />
              </div>
              <div style={{ minWidth: 0 }}>
                <strong
                  style={{
                    fontSize: "1rem",
                    fontWeight: 600,
                    color: t.textPrimary,
                    display: "block",
                  }}
                >
                  {selectedService.title}
                </strong>
                <span style={{ fontSize: "0.82rem", color: t.textMuted }}>
                  {selectedService.duration}
                  {selectedService.bookingMethod === "approval" ? " · Approval required" : " · Instant booking"}
                </span>
              </div>
            </div>
            <strong
              style={{
                fontSize: "1.1rem",
                fontWeight: 700,
                color: t.textPrimary,
                flexShrink: 0,
              }}
            >
              {formatCurrency(selectedService.price)}
            </strong>
          </div>
        ) : (
          <span style={{ color: t.textTertiary, fontSize: "0.9rem" }}>No services available.</span>
        )}

        {/* Service changer (compact dropdown if multiple services) */}
        {services.length > 1 ? (
          <div style={{ marginTop: "14px" }}>
            <label style={{ ...labelStyle, marginBottom: "6px" }}>Change service</label>
            <select
              style={selectStyle}
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
            >
              {services.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.title} — {formatCurrency(s.price)} — {s.duration}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      {/* ── Date & Time ── */}
      <div style={cardStyle}>
        <span style={labelStyle}>Date & Time</span>

        {availability.loading ? (
          <div style={{ color: t.textMuted, fontSize: "0.9rem", padding: "8px 0" }}>
            Loading available times…
          </div>
        ) : availability.error ? (
          <div style={{ color: "#dc2626", fontSize: "0.9rem", padding: "8px 0" }}>
            {availability.error}
          </div>
        ) : availability.windows.length ? (
          <div style={{ display: "grid", gap: "14px" }}>
            {/* Date selector */}
            <div>
              <label style={{ ...labelStyle, marginBottom: "6px", textTransform: "none", letterSpacing: "0", fontWeight: 500 }}>
                <CalendarDays size={13} style={{ display: "inline", marginRight: "4px", verticalAlign: "-2px" }} />
                Choose date
              </label>
              <select
                style={selectStyle}
                value={windowDate}
                onChange={(e) => {
                  setWindowDate(e.target.value);
                  const win = availability.windows.find((w) => w.date === e.target.value);
                  setSlot(win?.slots?.[0] || "");
                }}
              >
                {availability.windows.map((w) => (
                  <option key={w.date} value={w.date}>
                    {w.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Time slots */}
            {selectedWindow?.slots?.length ? (
              <div>
                <label style={{ ...labelStyle, marginBottom: "10px", textTransform: "none", letterSpacing: "0", fontWeight: 500 }}>
                  <Clock size={13} style={{ display: "inline", marginRight: "4px", verticalAlign: "-2px" }} />
                  Choose time
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {selectedWindow.slots.map((item) => {
                    const active = slot === item;
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setSlot(item)}
                        style={{
                          padding: "8px 14px",
                          borderRadius: "10px",
                          border: active ? "none" : "1px solid #e2e8f0",
                          background: active
                            ? "linear-gradient(135deg, #2856f8 0%, #54b6ff 100%)"
                            : "#fff",
                          color: active ? "#fff" : t.textSecondary,
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all 0.18s ease",
                          boxShadow: active
                            ? "0 4px 12px rgba(37,99,235,0.25)"
                            : "none",
                        }}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{ color: t.textTertiary, fontSize: "0.85rem" }}>
                No slots available for this date.
              </div>
            )}
          </div>
        ) : (
          <div style={{ color: t.textTertiary, fontSize: "0.9rem", padding: "8px 0" }}>
            No live slots. Try another service or come back later.
          </div>
        )}
      </div>

      {/* ── Your Details ── */}
      <form onSubmit={handleSubmit} style={cardStyle}>
        <span style={labelStyle}>
          <User size={13} style={{ display: "inline", marginRight: "4px", verticalAlign: "-2px" }} />
          Your Details
        </span>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
          <div>
            <label style={{ ...labelStyle, textTransform: "none", letterSpacing: "0", fontWeight: 500, marginBottom: "6px" }}>
              Full name <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              style={inputStyle}
              placeholder="Jane Doe"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label style={{ ...labelStyle, textTransform: "none", letterSpacing: "0", fontWeight: 500, marginBottom: "6px" }}>
              Email <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              style={inputStyle}
              type="email"
              placeholder="jane@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div>
            <label style={{ ...labelStyle, textTransform: "none", letterSpacing: "0", fontWeight: 500, marginBottom: "6px" }}>
              Phone
            </label>
            <input
              style={inputStyle}
              type="tel"
              placeholder="(555) 000-0000"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
        </div>

        <div style={{ marginTop: "14px" }}>
          <label style={{ ...labelStyle, textTransform: "none", letterSpacing: "0", fontWeight: 500, marginBottom: "6px" }}>
            Notes for the stylist
          </label>
          <textarea
            style={textareaStyle}
            rows={3}
            placeholder="Any allergies, preferences, or questions…"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>

        {/* Deposit */}
        {!isApprovalBooking && depositAmount ? (
          <div
            style={{
              marginTop: "16px",
              padding: "14px 16px",
              borderRadius: t.radiusSm,
              background: t.chipBg,
              border: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <strong style={{ fontSize: "0.9rem", color: t.textPrimary }}>Deposit</strong>
              <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: t.textMuted }}>
                Secure with {formatCurrency(depositAmount)} now. Pay the rest at your appointment.
              </p>
            </div>
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 14px",
                borderRadius: "10px",
                background: payDepositNow ? t.accentSoft : "transparent",
                border: payDepositNow ? `1px solid ${t.accent}` : "1px solid #e2e8f0",
                cursor: "pointer",
                fontSize: "0.85rem",
                fontWeight: 600,
                color: payDepositNow ? t.accent : t.textSecondary,
                transition: "all 0.2s ease",
                userSelect: "none",
              }}
            >
              <input
                type="checkbox"
                checked={payDepositNow}
                onChange={(e) => setPayDepositNow(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: t.accent, cursor: "pointer" }}
              />
              Pay deposit now
            </label>
          </div>
        ) : null}

        {/* Summary row */}
        <div
          style={{
            marginTop: "18px",
            paddingTop: "18px",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <span style={{ fontSize: "0.78rem", color: t.textTertiary }}>Total</span>
            <strong
              style={{
                display: "block",
                fontSize: "1.35rem",
                fontWeight: 700,
                color: t.textPrimary,
                letterSpacing: "-0.02em",
              }}
            >
              {formatCurrency(selectedService?.price || 0)}
            </strong>
          </div>

          <SiteButton
            disabled={status.loading || !selectedWindow || !slot}
            type="submit"
            style={{
              padding: "12px 32px",
              borderRadius: "14px",
              fontSize: "0.95rem",
            }}
          >
            {status.loading
              ? "Confirming…"
              : isApprovalBooking
                ? "Send booking request"
                : payDepositNow && depositAmount
                  ? `Pay ${formatCurrency(depositAmount)} deposit`
                  : `Confirm for ${formatCurrency(selectedService?.price || 0)}`}
          </SiteButton>
        </div>
      </form>

      {/* Status message */}
      {status.message ? (
        <div
          style={{
            ...cardStyle,
            borderLeft: `4px solid ${status.booking ? "#22c55e" : "#f59e0b"}`,
          }}
        >
          <strong style={{ fontSize: "0.95rem", color: t.textPrimary, display: "block", marginBottom: "6px" }}>
            {status.booking?.status === "pending_approval"
              ? "Request sent"
              : status.booking
                ? "Booking confirmed"
                : "Notice"}
          </strong>
          <span style={{ fontSize: "0.88rem", color: t.textSecondary }}>{status.message}</span>
        </div>
      ) : null}

      {/* Stripe checkout */}
      {checkout ? (
        <div style={cardStyle}>
          <StripeDepositCheckout
            clientSecret={checkout.clientSecret}
            amount={checkout.amount}
            onPaid={handleStripePaid}
            onCancel={() => setCheckout(null)}
          />
        </div>
      ) : null}
    </div>
  );
}
