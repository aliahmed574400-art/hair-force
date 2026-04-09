"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function JoinForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    businessName: "",
    email: "",
    password: "",
    city: "",
    location: "",
    category: "Salon",
    notes: ""
  });
  const [status, setStatus] = useState({ loading: false, message: "" });

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ loading: true, message: "" });

    try {
      const response = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to submit.");
      }

      setStatus({
        loading: false,
        message: `Welcome to Hair Force, ${data.vendor.name || form.businessName}. Redirecting to your vendor dashboard...`
      });
      setForm({
        name: "",
        businessName: "",
        email: "",
        password: "",
        city: "",
        location: "",
        category: "Salon",
        notes: ""
      });
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setStatus({ loading: false, message: error.message });
    }
  }

  return (
    <div className="surface form-shell">
      <div className="eyebrow">Vendor onboarding</div>
      <h3 style={{ margin: "12px 0 10px", fontFamily: "var(--font-display)", fontSize: "2rem" }}>
        Join the Hair Force marketplace
      </h3>
      <p className="muted" style={{ marginBottom: 20 }}>
        Publish your services, availability, and profile so clients can discover and book you directly.
      </p>
      <form className="form-grid" onSubmit={handleSubmit}>
        <input
          className="form-control"
          placeholder="Your name"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          required
        />
        <input
          className="form-control"
          placeholder="Business name"
          value={form.businessName}
          onChange={(event) => setForm({ ...form, businessName: event.target.value })}
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
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(event) => setForm({ ...form, password: event.target.value })}
          required
        />
        <input
          className="form-control"
          placeholder="City"
          value={form.city}
          onChange={(event) => setForm({ ...form, city: event.target.value })}
          required
        />
        <input
          className="form-control form-span-2"
          placeholder="Studio address or location"
          value={form.location}
          onChange={(event) => setForm({ ...form, location: event.target.value })}
        />
        <select
          className="form-control"
          value={form.category}
          onChange={(event) => setForm({ ...form, category: event.target.value })}
        >
          <option value="Salon">Salon</option>
          <option value="Barber">Barber</option>
          <option value="Spa">Spa</option>
          <option value="Makeup">Makeup</option>
          <option value="Nails">Nails</option>
          <option value="Braids">Braids</option>
        </select>
        <textarea
          className="form-control form-span-2"
          rows="4"
          placeholder="Tell Hair Force what makes your business stand out"
          value={form.notes}
          onChange={(event) => setForm({ ...form, notes: event.target.value })}
        />
        <button className="button button-primary form-span-2" disabled={status.loading}>
          {status.loading ? "Submitting..." : "Start onboarding"}
        </button>
      </form>
      {status.message ? (
        <div className="booking-confirm">
          <span className="muted">{status.message}</span>
        </div>
      ) : null}
    </div>
  );
}
