import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const payload = await request.json();
    const amount = Number(payload.amount || 0);
    const currency = String(payload.currency || process.env.PAYMENT_CURRENCY || "usd").toLowerCase();

    // SECURITY: Validate amount is positive number
    if (!amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount. Amount must be greater than 0." }, { status: 400 });
    }

    // SECURITY: Limit maximum payment amount to prevent abuse
    if (amount > 999999) {
      return NextResponse.json({ error: "Amount exceeds maximum allowed payment." }, { status: 400 });
    }

    if (process.env.STRIPE_SECRET_KEY) {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: "2025-02-24.acacia"
      });

      // SECURITY: Generate idempotency key to prevent duplicate charges
      const idempotencyKey = String(payload.idempotencyKey || "").trim() || 
        `${payload.bookingId || 'booking'}-${Date.now()}`;

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency,
        automatic_payment_methods: { enabled: true },
        idempotency_key: idempotencyKey,
        metadata: {
          // SECURITY: Metadata should not be editable by client - these should be verified server-side
          bookingType: "deposit"
        }
      });

      return NextResponse.json({
        checkout: {
          provider: "stripe",
          paymentIntentId: paymentIntent.id,
          clientSecret: paymentIntent.client_secret,
          amount,
          currency: currency.toUpperCase(),
          status: paymentIntent.status
        }
      });
    }

    return NextResponse.json({
      checkout: {
        provider: "mock",
        paymentIntentId: `pi_${Date.now()}`,
        amount,
        currency: currency.toUpperCase(),
        status: "deposit_paid",
        message:
          "Mock checkout completed. Add STRIPE_SECRET_KEY to switch this route to real Stripe PaymentIntent creation."
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
