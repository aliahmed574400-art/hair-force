"use client";

import { useMemo, useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import SiteButton from "@/components/ui/SiteButton";
import { formatCurrency } from "@/lib/utils";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

function StripeDepositForm({ amount, onPaid, onCancel }) {
  const stripe = useStripe();
  const elements = useElements();
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setSubmitting(true);
    setStatus("");

    const result = await stripe.confirmPayment({
      elements,
      redirect: "if_required"
    });

    if (result.error) {
      setStatus(result.error.message || "Unable to confirm payment.");
      setSubmitting(false);
      return;
    }

    await onPaid(result.paymentIntent);
    setSubmitting(false);
  }

  return (
    <div className="selection-card active" style={{ marginTop: 16 }}>
      <strong>Complete your deposit</strong>
      <p className="muted tiny" style={{ margin: "8px 0 14px" }}>
        Pay {formatCurrency(amount)} securely to reserve this appointment.
      </p>
      <form onSubmit={handleSubmit}>
        <PaymentElement />
        <div className="hero-actions" style={{ marginTop: 16 }}>
          <SiteButton disabled={submitting || !stripe} type="submit">
            {submitting ? "Processing..." : "Pay and confirm"}
          </SiteButton>
          <SiteButton onClick={onCancel} type="button" variant="secondary">
            Cancel
          </SiteButton>
        </div>
      </form>
      {status ? (
        <div className="booking-confirm">
          <span className="muted">{status}</span>
        </div>
      ) : null}
    </div>
  );
}

export default function StripeDepositCheckout({ clientSecret, amount, onPaid, onCancel }) {
  const options = useMemo(
    () => ({
      clientSecret,
      appearance: {
        theme: "night",
        variables: {
          colorPrimary: "#4d7bff",
          colorBackground: "#0b1834",
          colorText: "#f7f9ff"
        }
      }
    }),
    [clientSecret]
  );

  if (!publishableKey || !stripePromise) {
    return (
      <div className="booking-confirm">
        <span className="muted">
          Stripe server setup is present, but `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is missing on the frontend. Add it to enable the embedded payment form.
        </span>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={options}>
      <StripeDepositForm amount={amount} onPaid={onPaid} onCancel={onCancel} />
    </Elements>
  );
}
