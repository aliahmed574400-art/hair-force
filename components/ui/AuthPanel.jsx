"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthPanel({ mode = "signup" }) {
  const isSignup = mode === "signup";
  const router = useRouter();
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "" });
  const [status, setStatus] = useState({ loading: false, message: "" });

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

      router.push("/dashboard");
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
            <input
              className="form-control"
              placeholder="Full name"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
            />
            <input
              className="form-control"
              placeholder="Phone number"
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
            />
          </>
        ) : null}

        <input
          className={`form-control ${isSignup ? "" : "form-span-2"}`}
          type="email"
          placeholder="Email address"
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
          required
        />

        <input
          className={`form-control ${isSignup ? "" : "form-span-2"}`}
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(event) => setForm({ ...form, password: event.target.value })}
          required
        />

        <button className="button button-primary form-span-2" disabled={status.loading}>
          {status.loading ? "Working..." : isSignup ? "Create account" : "Sign in"}
        </button>
      </form>

      {status.message ? (
        <div className="booking-confirm">
          <span className="muted">{status.message}</span>
        </div>
      ) : null}

      {!isSignup ? (
        <div className="booking-confirm">
          <strong style={{ display: "block", marginBottom: 8 }}>Demo access</strong>
          <span className="muted">Client: `client@hairforce.app` / `demo12345`</span>
          <br />
          <span className="muted">Vendor: `vendor@hairforce.app` / `demo12345`</span>
          <br />
          <span className="muted">Admin: `admin@hairforce.app` / `demo12345`</span>
        </div>
      ) : null}
    </div>
  );
}
