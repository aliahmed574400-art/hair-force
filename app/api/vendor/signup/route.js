import { NextResponse } from "next/server";
import { createVendorAccount } from "@/lib/postgres-repositories";
import { applySessionCookie } from "@/lib/session";
import { checkRateLimit } from "@/lib/security-middleware";

export async function POST(request) {
  try {
    const payload = await request.json();
    const firstName = String(payload.firstName || "").trim();
    const lastName = String(payload.lastName || "").trim();
    const businessName = String(payload.businessName || "").trim();
    const email = String(payload.email || "").trim().toLowerCase();
    const password = String(payload.password || "");
    const confirmPassword = String(payload.confirmPassword || "");
    const category = String(payload.category || "").trim();
    const city = String(payload.city || "").trim();
    const termsAccepted = payload.termsAccepted === true;

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: "First and last name are required." },
        { status: 400 }
      );
    }

    if (!businessName) {
      return NextResponse.json(
        { error: "Business name is required." },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { error: "Password is required." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    if (confirmPassword && password !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match." },
        { status: 400 }
      );
    }

    if (!termsAccepted) {
      return NextResponse.json(
        { error: "You must accept the terms to create an account." },
        { status: 400 }
      );
    }

    const rateLimitKey = `vendor-signup:${email}`;
    if (!(await checkRateLimit(rateLimitKey, 5, 3600000))) {
      return NextResponse.json(
        { error: "Too many sign-up attempts. Please try again later." },
        { status: 429 }
      );
    }

    const result = await createVendorAccount({
      firstName,
      lastName,
      businessName,
      email,
      password,
      category,
      city,
      termsAccepted
    });

    const response = NextResponse.json({ user: result.user, vendor: result.vendor }, { status: 201 });
    await applySessionCookie(response, result.user, request);
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to create vendor account." },
      { status: 400 }
    );
  }
}
