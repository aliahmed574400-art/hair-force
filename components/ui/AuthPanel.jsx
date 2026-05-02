"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import GoogleAuthButton from "@/components/ui/GoogleAuthButton";
import PhoneSigninPanel from "@/components/ui/PhoneSigninPanel";
import SiteButton from "@/components/ui/SiteButton";

export default function AuthPanel({ mode = "signup" }) {
  const isSignup = mode === "signup";
  const router = useRouter();
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "" });
  const [status, setStatus] = useState({ loading: false, message: "" });
  const forgotPasswordHref = form.email
    ? `/forgot-password?email=${encodeURIComponent(form.email)}`
    : "/forgot-password";

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ loading: true, message: "" });

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Request failed.");
      }

      setStatus({
        loading: false,
        message: isSignup
          ? "Account created. Redirecting to your dashboard..."
          : `Welcome back, ${data.user.name || "client"}.`
      });

      if (isSignup) {
        setForm({ name: "", phone: "", email: "", password: "" });
      }

      const nextHref = !isSignup && data.user?.role === "admin" ? "/admin" : "/dashboard";

      router.push(nextHref);
      router.refresh();
    } catch (error) {
      setStatus({ loading: false, message: error.message });
    }
  }

  return (
    <div className="surface form-shell">
      <div className="eyebrow">{isSignup ? "Client onboarding" : "Sign in"}</div>
      <h2 style={{ margin: "12px 0 10px", fontFamily: "var(--font-display)", fontSize: "2.4rem" }}>
        {isSignup ? "Create your Hair Force account" : "Welcome back"}
      </h2>
      <p className="muted" style={{ marginBottom: 20 }}>
        {isSignup
          ? "Save bookings, rebook faster, and manage your upcoming appointments."
          : "Access your bookings, favorites, and future rebook reminders."}
      </p>

      <form className="form-grid" onSubmit={handleSubmit}>
        {isSignup ? (
          <>
            <div className="form-field">
              <label className="form-label" htmlFor={`${mode}-name`}>
                Full name
              </label>
              <input
                id={`${mode}-name`}
                className="form-control"
                placeholder="Full name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor={`${mode}-phone`}>
                Phone number
              </label>
              <input
                id={`${mode}-phone`}
                className="form-control"
                placeholder="Phone number"
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
              />
            </div>
          </>
        ) : null}

        <div className={`form-field ${isSignup ? "" : "form-span-2"}`}>
          <label className="form-label" htmlFor={`${mode}-email`}>
            Email address
          </label>
          <input
            id={`${mode}-email`}
            className="form-control"
            type="email"
            placeholder="Email address"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            required
          />
        </div>

        <div className={`form-field ${isSignup ? "" : "form-span-2"}`}>
          <label className="form-label" htmlFor={`${mode}-password`}>
            Password
          </label>
          <input
            id={`${mode}-password`}
            className="form-control"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            required
          />
        </div>

        {!isSignup ? (
          <div className="auth-panel-meta form-span-2">
            <Link href={forgotPasswordHref} className="auth-panel-link">
              Forgot password?
            </Link>
            <span className="muted tiny">
              New here?{" "}
              <Link href="/signup" className="auth-panel-link">
                Sign up
              </Link>
            </span>
          </div>
        ) : null}

        <SiteButton className="form-span-2" disabled={status.loading} fullWidth type="submit">
          {status.loading ? "Working..." : isSignup ? "Create account" : "Sign in"}
        </SiteButton>
      </form>

      <GoogleAuthButton mode={mode} accountRole="client" onStatusChange={setStatus} />

      {!isSignup ? <PhoneSigninPanel /> : null}

      {status.message ? (
        <div className="booking-confirm">
          <span className="muted">{status.message}</span>
        </div>
      ) : null}

      {!isSignup ? (
        <div className="booking-confirm">
          <strong style={{ display: "block", marginBottom: 8 }}>Demo access</strong>
          <div className="auth-panel-demo-list">
            <code className="auth-panel-demo-code">Client: client@hairforce.app / demo12345</code>
            <code className="auth-panel-demo-code">Vendor: vendor@hairforce.app / demo12345</code>
            <code className="auth-panel-demo-code">Admin: admin@hairforce.app / demo12345</code>
          </div>
        </div>
      ) : null}

      <p className="auth-panel-switch">
        {isSignup ? (
          <>
            Already have an account?{" "}
            <Link href="/signin" className="auth-panel-link">
              Sign in
            </Link>
          </>
        ) : (
          <>
            Need a Hair Force account?{" "}
            <Link href="/signup" className="auth-panel-link">
              Create one
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
