"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import GoogleAuthButton from "@/components/ui/GoogleAuthButton";
import { categories } from "@/lib/data";
import { Sparkles, ArrowRight } from "lucide-react";

export default function VendorSignupForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    businessName: "",
    email: "",
    password: "",
    confirmPassword: "",
    category: "",
    city: "",
    termsAccepted: false
  });
  const [status, setStatus] = useState({ loading: false, message: "" });
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!success) return;
    const id = setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 1800);
    return () => clearTimeout(id);
  }, [success, router]);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (form.password !== form.confirmPassword) {
      setStatus({ loading: false, message: "Passwords do not match." });
      return;
    }

    if (!form.termsAccepted) {
      setStatus({ loading: false, message: "Please accept the terms before creating your account." });
      return;
    }

    setStatus({ loading: true, message: "" });

    try {
      const response = await fetch("/api/vendor/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not create your stylist account.");
      }

      setStatus({ loading: false, message: "" });
      setSuccess(true);
    } catch (error) {
      setStatus({ loading: false, message: error.message });
    }
  }

  if (success) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="signup-success-state">
          <div className="signup-success-icon" aria-hidden="true">
            <span />
          </div>
          <div className="signup-flow-copy">
            <h2 className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-foreground">Stylist account created</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">Redirecting you to your dashboard now.</p>
          </div>
          <div className="signup-success-bar" aria-hidden="true">
            <span />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Mobile logo */}
      <div className="mb-8 flex items-center justify-center gap-3 text-lg font-semibold text-foreground lg:hidden">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Sparkles className="h-5 w-5" />
        </div>
        <span>Hair Force</span>
      </div>

      <div className="mb-6 rounded-none border-0 bg-transparent p-0 shadow-none backdrop-blur-none">
        {/* Header */}
        <div className="mb-6 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-primary/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-primary">
            Stylist sign up
          </span>
          <h1 className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-foreground">
            Create your stylist account
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            List your services, set your availability, and start receiving bookings.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="vendor-first-name" className="text-sm font-medium text-slate-700">
                First name
              </Label>
              <Input
                id="vendor-first-name"
                placeholder="First name"
                value={form.firstName}
                onChange={(e) => updateField("firstName", e.target.value)}
                required
                className="h-12 border-border/80 bg-white px-4 shadow-sm focus-visible:ring-primary/30"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendor-last-name" className="text-sm font-medium text-slate-700">
                Last name
              </Label>
              <Input
                id="vendor-last-name"
                placeholder="Last name"
                value={form.lastName}
                onChange={(e) => updateField("lastName", e.target.value)}
                required
                className="h-12 border-border/80 bg-white px-4 shadow-sm focus-visible:ring-primary/30"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vendor-business-name" className="text-sm font-medium text-slate-700">
              Business name
            </Label>
            <Input
              id="vendor-business-name"
              placeholder="Your business or studio name"
              value={form.businessName}
              onChange={(e) => updateField("businessName", e.target.value)}
              required
              className="h-12 border-border/80 bg-white px-4 shadow-sm focus-visible:ring-primary/30"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vendor-email" className="text-sm font-medium text-slate-700">
              Email
            </Label>
            <Input
              id="vendor-email"
              type="email"
              placeholder="Email address"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              required
              className="h-12 border-border/80 bg-white px-4 shadow-sm focus-visible:ring-primary/30"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="vendor-password" className="text-sm font-medium text-slate-700">
                Password
              </Label>
              <Input
                id="vendor-password"
                type="password"
                placeholder="Create a password"
                value={form.password}
                onChange={(e) => updateField("password", e.target.value)}
                required
                minLength={8}
                className="h-12 border-border/80 bg-white px-4 shadow-sm focus-visible:ring-primary/30"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendor-confirm-password" className="text-sm font-medium text-slate-700">
                Confirm password
              </Label>
              <Input
                id="vendor-confirm-password"
                type="password"
                placeholder="Confirm password"
                value={form.confirmPassword}
                onChange={(e) => updateField("confirmPassword", e.target.value)}
                required
                className="h-12 border-border/80 bg-white px-4 shadow-sm focus-visible:ring-primary/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="vendor-category" className="text-sm font-medium text-slate-700">
                Category
              </Label>
              <select
                id="vendor-category"
                value={form.category}
                onChange={(e) => updateField("category", e.target.value)}
                required
                className="h-12 w-full rounded-md border border-border/80 bg-white px-4 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendor-city" className="text-sm font-medium text-slate-700">
                City
              </Label>
              <Input
                id="vendor-city"
                placeholder="City"
                value={form.city}
                onChange={(e) => updateField("city", e.target.value)}
                className="h-12 border-border/80 bg-white px-4 shadow-sm focus-visible:ring-primary/30"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <input
              id="vendor-terms"
              type="checkbox"
              checked={form.termsAccepted}
              onChange={(e) => updateField("termsAccepted", e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <Label htmlFor="vendor-terms" className="cursor-pointer text-sm font-normal text-muted-foreground">
              I agree to the terms and account guidelines.
            </Label>
          </div>

          {status.message ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {status.message}
            </div>
          ) : null}

          <Button
            type="submit"
            className="h-12 w-full rounded-xl text-base font-medium shadow-lg shadow-blue-500/15"
            size="lg"
            disabled={status.loading}
          >
            {status.loading ? "Creating account..." : "Create stylist account"}
          </Button>
        </form>

        <div className="mt-6">
          <div className="mb-4 flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
              Or create an account with
            </span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="space-y-3">
            <GoogleAuthButton
              mode="signup"
              accountRole="vendor"
              onStatusChange={setStatus}
              showDivider={false}
              showHelperText={false}
              buttonWidth={380}
              className="google-auth-shell-wide"
            />
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Already have a stylist account?{" "}
          <Link href="/vendor/signin" className="font-medium text-foreground hover:underline">
            Sign in
          </Link>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <span>Looking for a stylist?</span>
        <Link
          href="/signin"
          className="inline-flex items-center gap-1 font-medium text-foreground transition-colors hover:text-primary"
        >
          Client sign in
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </>
  );
}
