"use client";

import { useEffect, useMemo, useState } from "react";
import StripeDepositCheckout from "@/components/ui/StripeDepositCheckout";
import { calculateDeposit, formatCurrency } from "@/lib/utils";

export default function BookingForm({ vendor }) {
  const [serviceId, setServiceId] = useState(vendor.services[0]?.id || "");
  const [windowDate, setWindowDate] = useState(vendor.bookingWindows[0]?.date || "");
  const [slot, setSlot] = useState(vendor.bookingWindows[0]?.slots[0] || "");
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" });
  const [payDepositNow, setPayDepositNow] = useState(true);
  const [checkout, setCheckout] = useState(null);
  const [status, setStatus] = useState({ loading: false, message: "", booking: null });

  const selectedService = vendor.services.find((item) => item.id === serviceId) || vendor.services[0];
  const selectedWindow =
    vendor.bookingWindows.find((item) => item.date === windowDate) || vendor.bookingWindows[0];
  const depositAmount = useMemo(
    () => calculateDeposit(selectedService, selectedService?.price),
    [selectedService]
  );

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
        depositAmount: paymentDetails.depositAmount ?? (payDepositNow ? depositAmount : 0),
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
    setStatus({ loading: true, message: "", booking: null });

    try {
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
            message: "Payment intent created. Complete the Stripe deposit form below to finish the booking.",
            booking: null
          });
          return;
        }

        paymentIntentId = checkoutData.checkout.paymentIntentId;
        paymentStatus = checkoutData.checkout.status;
      }

      const booking = await finalizeBooking({
        depositAmount: payDepositNow ? depositAmount : 0,
        paymentStatus,
        paymentIntentId
      });

      setStatus({
        loading: false,
        message:
          paymentStatus === "deposit_paid"
            ? "Appointment confirmed and the mock deposit flow completed. Replace the checkout route with your payment provider next."
            : "Appointment confirmed. The booking is reserved and marked for later payment.",
        booking
      });
      setForm({ name: "", email: "", phone: "", notes: "" });
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
      setForm({ name: "", email: "", phone: "", notes: "" });
    } catch (error) {
      setStatus({ loading: false, message: error.message, booking: null });
    }
  }

  return (
    <div className="surface form-shell">
      <div className="row-between" style={{ marginBottom: 18 }}>
        <div>
          <div className="eyebrow">Book instantly</div>
          <h3 style={{ margin: "10px 0 6px", fontFamily: "var(--font-display)", fontSize: "2rem" }}>
            Reserve your slot
          </h3>
        </div>
        <span className="badge badge-accent">{formatCurrency(selectedService?.price || 0)}</span>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="selection-grid">
          {vendor.services.map((service) => (
            <label
              key={service.id}
              className={`selection-card ${serviceId === service.id ? "active" : ""}`}
            >
              <input
                type="radio"
                name="service"
                checked={serviceId === service.id}
                onChange={() => setServiceId(service.id)}
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
            </label>
          ))}
        </div>

        <div className="selection-grid" style={{ marginTop: 16 }}>
          {vendor.bookingWindows.map((window) => (
            <label
              key={window.date}
              className={`selection-card ${windowDate === window.date ? "active" : ""}`}
            >
              <input
                type="radio"
                name="window"
                checked={windowDate === window.date}
                onChange={() => {
                  setWindowDate(window.date);
                  setSlot(window.slots[0]);
                }}
              />
              <strong>{window.label}</strong>
            </label>
          ))}
        </div>

        <div className="slot-grid">
          {selectedWindow?.slots.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setSlot(item)}
              className={`button ${slot === item ? "button-primary" : "button-secondary"}`}
              style={{ minHeight: 42 }}
            >
              {item}
            </button>
          ))}
        </div>

        {depositAmount ? (
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
            Selected slot: {selectedWindow?.label} - {slot}
          </div>
          <textarea
            className="form-control form-span-2"
            rows="4"
            placeholder="Notes for the stylist"
            value={form.notes}
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
          />
        </div>

        <button className="button button-primary" style={{ marginTop: 18, width: "100%" }} disabled={status.loading}>
          {status.loading
            ? "Confirming..."
            : payDepositNow && depositAmount
              ? `Pay ${formatCurrency(depositAmount)} deposit`
              : `Confirm for ${formatCurrency(selectedService?.price || 0)}`}
        </button>
      </form>

      {status.message ? (
        <div className="booking-confirm">
          <strong style={{ display: "block", marginBottom: 8 }}>{status.booking ? "Booking confirmed" : "Notice"}</strong>
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
