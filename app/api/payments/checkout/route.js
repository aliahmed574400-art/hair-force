import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const payload = await request.json();
    const amount = Number(payload.amount || 0);
    const currency = String(payload.currency || process.env.PAYMENT_CURRENCY || "usd").toLowerCase();

    if (!amount) {
      return NextResponse.json({ error: "Amount is required." }, { status: 400 });
    }

    if (process.env.STRIPE_SECRET_KEY) {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: "2025-02-24.acacia"
      });

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency,
        automatic_payment_methods: { enabled: true },
        metadata: {
          vendorSlug: String(payload.vendorSlug || ""),
          serviceName: String(payload.serviceName || ""),
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
