"use client";

import { useEffect, useMemo, useState } from "react";
import StripeDepositCheckout from "@/components/ui/StripeDepositCheckout";
import SiteButton from "@/components/ui/SiteButton";
import { calculateDeposit, formatCurrency } from "@/lib/utils";

const BOOKING_STEPS = [
  { id: "service", label: "1. Service" },
  { id: "time", label: "2. Time" },
  { id: "details", label: "3. Details" },
  { id: "confirm", label: "4. Confirm" }
];

export default function BookingForm({ vendor, initialSelection = {} }) {
  const services = vendor.services || [];
  const [serviceId, setServiceId] = useState(
    services.some((service) => String(service.id) === String(initialSelection.serviceId || ""))
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
  const selectedService = services.find((item) => String(item.id) === String(serviceId)) || services[0] || null;
  const selectedWindow = availability.windows.find((item) => item.date === windowDate) || availability.windows[0] || null;
  const depositAmount = useMemo(
    () => calculateDeposit(selectedService, selectedService?.price),
    [selectedService]
  );
  const isApprovalBooking = selectedService?.bookingMethod === "approval";

  useEffect(() => {
    async function hydrateUser() {
      const response = await fetch("/api/auth/me");
      const data = await response.json();

      if (data.user) {
        setForm((current) => ({
          ...current,
          name: current.name || data.user.name || "",
          email: current.email || data.user.email || "",
          phone: current.phone || data.user.phone || ""
        }));
      }
    }

    hydrateUser();
  }, []);

  useEffect(() => {
    if (!selectedService?.id) {
      return undefined;
    }

    let cancelled = false;

    async function loadAvailability() {
      setAvailability({ loading: true, error: "", windows: [] });

      try {
        const response = await fetch(
          `/api/stylists/${vendor.slug}/availability?serviceId=${selectedService.id}&maxWindows=12`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to load available times.");
        }

        if (cancelled) {
          return;
        }

        const windows = data.windows || [];
        const preferredWindow =
          String(initialSelection.serviceId || "") === String(selectedService.id)
            ? windows.find((item) => item.date === String(initialSelection.date || ""))
            : null;
        const nextWindow = preferredWindow || windows[0] || null;
        const preferredSlot =
          nextWindow?.slots.includes(String(initialSelection.slot || "")) && preferredWindow
            ? String(initialSelection.slot)
            : nextWindow?.slots?.[0] || "";

        setAvailability({ loading: false, error: "", windows });
        setWindowDate(nextWindow?.date || "");
        setSlot(preferredSlot);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setAvailability({ loading: false, error: error.message, windows: [] });
        setWindowDate("");
        setSlot("");
      }
    }

    loadAvailability();

    return () => {
      cancelled = true;
    };
  }, [initialSelection.date, initialSelection.serviceId, initialSelection.slot, selectedService, vendor.slug]);

  async function finalizeBooking(paymentDetails = {}) {
    const response = await fetch("/api/bookings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
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
        paymentIntentId: paymentDetails.paymentIntentId
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Unable to create booking.");
    }

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
        const booking = await finalizeBooking({
          depositAmount,
          paymentStatus: "pay_later"
        });

        setStatus({
          loading: false,
          message: "Booking request sent. The stylist will review the time from their dashboard before it is confirmed.",
          booking
        });
        setCheckout(null);
        return;
      }

      let paymentIntentId = "";
      let paymentStatus = depositAmount && payDepositNow ? "deposit_paid" : depositAmount ? "deposit_due" : "pay_later";

      if (depositAmount && payDepositNow) {
        const checkoutResponse = await fetch("/api/payments/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: depositAmount,
            serviceName: selectedService.title,
            vendorSlug: vendor.slug
          })
        });
        const checkoutData = await checkoutResponse.json();

        if (!checkoutResponse.ok) {
          throw new Error(checkoutData.error || "Unable to initialize checkout.");
        }

        if (checkoutData.checkout.provider === "stripe" && checkoutData.checkout.clientSecret) {
          setCheckout({
            clientSecret: checkoutData.checkout.clientSecret,
            paymentIntentId: checkoutData.checkout.paymentIntentId,
            amount: depositAmount
          });
          setStatus({
            loading: false,
            message: "Payment intent created. Complete the deposit form below to finish the booking.",
            booking: null
          });
          return;
        }

        paymentIntentId = checkoutData.checkout.paymentIntentId;
        paymentStatus = checkoutData.checkout.status;
      }

      const booking = await finalizeBooking({
        depositAmount: payDepositNow ? depositAmount : depositAmount,
        paymentStatus,
        paymentIntentId
      });

      setStatus({
        loading: false,
        message:
          paymentStatus === "deposit_paid"
            ? "Appointment confirmed and your deposit flow completed successfully."
            : "Appointment confirmed. Your booking is reserved and payment is marked for later.",
        booking
      });
      setCheckout(null);
    } catch (error) {
      setStatus({ loading: false, message: error.message, booking: null });
    }
  }

  async function handleStripePaid(paymentIntent) {
    try {
      const booking = await finalizeBooking({
        depositAmount,
        paymentStatus: paymentIntent.status || "deposit_paid",
        paymentIntentId: paymentIntent.id || checkout?.paymentIntentId
      });

      setCheckout(null);
      setStatus({
        loading: false,
        message: "Appointment confirmed and your Stripe deposit was captured successfully.",
        booking
      });
    } catch (error) {
      setStatus({ loading: false, message: error.message, booking: null });
    }
  }

  return (
    <div className="surface form-shell">
      <div className="row-between" style={{ marginBottom: 18 }}>
        <div>
          <div className="eyebrow">Booking flow</div>
          <h3 style={{ margin: "10px 0 6px", fontFamily: "var(--font-display)", fontSize: "2rem" }}>
            Reserve your slot
          </h3>
        </div>
        <span className="badge badge-accent">{selectedService ? formatCurrency(selectedService.price || 0) : "Select"}</span>
      </div>

      <div className="stylist-booking-steps">
        {BOOKING_STEPS.map((step, index) => (
          <div key={step.id} className={`stylist-booking-step ${index === 3 && status.booking ? "complete" : ""}`}>
            {step.label}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="selection-grid">
          {services.map((service) => (
            <label
              key={service.id}
              className={`selection-card ${String(serviceId) === String(service.id) ? "active" : ""}`}
            >
              <input
                type="radio"
                name="service"
                checked={String(serviceId) === String(service.id)}
                onChange={() => setServiceId(String(service.id))}
              />
              <div className="service-meta">
                <div>
                  <strong>{service.title}</strong>
                  <p className="muted tiny" style={{ margin: "6px 0 0" }}>
                    {service.duration}
                  </p>
                </div>
                <strong>{formatCurrency(service.price)}</strong>
              </div>
              <div className="chip-row" style={{ marginTop: 10 }}>
                <span className="chip">{service.bookingMethod === "approval" ? "Approval required" : "Instant booking"}</span>
                {service.featured ? <span className="chip">Featured</span> : null}
              </div>
            </label>
          ))}
        </div>

        <div className="stylist-booking-summary">
          <strong>{selectedService?.title || "Select a service"}</strong>
          <p className="muted tiny" style={{ margin: "8px 0 0" }}>
            {isApprovalBooking
              ? "This stylist reviews and approves requests before the appointment is confirmed."
              : "Select a live slot below, then finish your details and payment on this page."}
          </p>
        </div>

        {availability.loading ? <div className="booking-confirm">Loading available times...</div> : null}
        {availability.error ? <div className="booking-confirm">{availability.error}</div> : null}

        {availability.windows.length ? (
          <>
            <div className="selection-grid" style={{ marginTop: 16 }}>
              {availability.windows.map((window) => (
                <label key={window.date} className={`selection-card ${windowDate === window.date ? "active" : ""}`}>
                  <input
                    type="radio"
                    name="window"
                    checked={windowDate === window.date}
                    onChange={() => {
                      setWindowDate(window.date);
                      setSlot(window.slots[0] || "");
                    }}
                  />
                  <strong>{window.label}</strong>
                </label>
              ))}
            </div>

            <div className="slot-grid">
              {(selectedWindow?.slots || []).map((item) => (
                <SiteButton
                  key={item}
                  onClick={() => setSlot(item)}
                  variant={slot === item ? "primary" : "secondary"}
                  size="sm"
                  style={{ minHeight: 42 }}
                  type="button"
                >
                  {item}
                </SiteButton>
              ))}
            </div>
          </>
        ) : (
          !availability.loading && (
            <div className="booking-confirm">
              <strong style={{ display: "block", marginBottom: 8 }}>No live slots</strong>
              <span className="muted">Try another service or come back later for updated availability.</span>
            </div>
          )
        )}

        {!isApprovalBooking && depositAmount ? (
          <div className="selection-card active" style={{ marginTop: 16 }}>
            <div className="service-meta">
              <div>
                <strong>Deposit option</strong>
                <p className="muted tiny" style={{ margin: "8px 0 0" }}>
                  Secure the appointment with {formatCurrency(depositAmount)} now and pay the remainder at the appointment.
                </p>
              </div>
              <label className="chip" style={{ cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={payDepositNow}
                  onChange={(event) => setPayDepositNow(event.target.checked)}
                  style={{ marginRight: 8 }}
                />
                Pay deposit now
              </label>
            </div>
          </div>
        ) : null}

        <div className="form-grid" style={{ marginTop: 18 }}>
          <input
            className="form-control"
            placeholder="Full name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            required
          />
          <input
            className="form-control"
            type="email"
            placeholder="Email address"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            required
          />
          <input
            className="form-control"
            placeholder="Phone number"
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
          />
          <div className="form-control" style={{ display: "flex", alignItems: "center" }}>
            Selected slot: {selectedWindow?.label || "Choose a day"} {slot ? `· ${slot}` : ""}
          </div>
          <textarea
            className="form-control form-span-2"
            rows="4"
            placeholder="Notes for the stylist"
            value={form.notes}
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
          />
        </div>

        <SiteButton disabled={status.loading || !selectedWindow || !slot} fullWidth style={{ marginTop: 18 }} type="submit">
          {status.loading
            ? "Confirming..."
            : isApprovalBooking
              ? "Send booking request"
              : payDepositNow && depositAmount
                ? `Pay ${formatCurrency(depositAmount)} deposit`
                : `Confirm for ${formatCurrency(selectedService?.price || 0)}`}
        </SiteButton>
      </form>

      {status.message ? (
        <div className="booking-confirm">
          <strong style={{ display: "block", marginBottom: 8 }}>
            {status.booking?.status === "pending_approval"
              ? "Request sent"
              : status.booking
                ? "Booking updated"
                : "Notice"}
          </strong>
          <span className="muted">{status.message}</span>
        </div>
      ) : null}

      {checkout ? (
        <StripeDepositCheckout
          clientSecret={checkout.clientSecret}
          amount={checkout.amount}
          onPaid={handleStripePaid}
          onCancel={() => setCheckout(null)}
        />
      ) : null}
    </div>
  );
}
