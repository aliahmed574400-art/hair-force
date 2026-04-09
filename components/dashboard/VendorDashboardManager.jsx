"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

const DAY_OPTIONS = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" }
];

function defaultServiceForm() {
  return {
    title: "",
    duration: "",
    price: "",
    description: "",
    depositType: "percentage",
    depositValue: 20,
    imageUrl: ""
  };
}

function createProfileForm(vendor) {
  return {
    name: vendor.name || "",
    owner: vendor.owner || "",
    category: vendor.category || "",
    city: vendor.city || "",
    location: vendor.location || "",
    heroTag: vendor.heroTag || "",
    tagline: vendor.tagline || "",
    bio: vendor.bio || "",
    coverImage: vendor.coverImage || "",
    specialties: (vendor.specialties || []).join(", "),
    amenities: (vendor.amenities || []).join(", ")
  };
}

function createAvailabilityForm(vendor) {
  return (vendor.availabilityRules || []).map((item) => ({
    dayOfWeek: String(item.dayOfWeek ?? 1),
    startTime: item.startTime || "10:00",
    endTime: item.endTime || "18:00",
    slotMinutes: String(item.slotMinutes || 120),
    active: item.active !== false
  }));
}

function createAvailabilityItem() {
  return {
    dayOfWeek: "1",
    startTime: "10:00",
    endTime: "18:00",
    slotMinutes: "120",
    active: true
  };
}

export default function VendorDashboardManager({ user, initialData }) {
  const [dashboard, setDashboard] = useState(initialData);
  const [profileForm, setProfileForm] = useState(createProfileForm(initialData.vendor));
  const [availabilityForm, setAvailabilityForm] = useState(createAvailabilityForm(initialData.vendor));
  const [blackoutDatesText, setBlackoutDatesText] = useState(
    (initialData.vendor.blackoutDates || []).join(", ")
  );
  const [serviceForm, setServiceForm] = useState(defaultServiceForm());
  const [editingServiceId, setEditingServiceId] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState({
    profile: false,
    availability: false,
    service: false,
    deleteId: "",
    coverUpload: false,
    serviceUpload: false
  });

  const bookings = dashboard.bookings || [];
  const services = dashboard.services || [];

  const metrics = useMemo(
    () => [
      { label: "Revenue", value: formatCurrency(dashboard.summary.revenue || 0) },
      { label: "Bookings today", value: dashboard.summary.bookingsToday || 0 },
      { label: "Services", value: dashboard.summary.servicesCount || 0 },
      { label: "Profile strength", value: `${dashboard.summary.profileStrength || 0}%` }
    ],
    [dashboard.summary]
  );

  async function refreshFromResponse(response) {
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Request failed.");
    }

    setDashboard(data);
    setProfileForm(createProfileForm(data.vendor));
    setAvailabilityForm(createAvailabilityForm(data.vendor));
    setBlackoutDatesText((data.vendor.blackoutDates || []).join(", "));
    return data;
  }

  async function uploadAsset(file, folder) {
    const payload = new FormData();
    payload.append("file", file);
    payload.append("folder", folder);

    const response = await fetch("/api/uploads", {
      method: "POST",
      body: payload
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Unable to upload image.");
    }

    return data.url;
  }

  async function handleProfileSubmit(event) {
    event.preventDefault();
    setLoading((current) => ({ ...current, profile: true }));
    setStatus({ type: "", message: "" });

    try {
      const response = await fetch("/api/dashboard/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm)
      });

      await refreshFromResponse(response);
      setStatus({ type: "success", message: "Profile updated." });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading((current) => ({ ...current, profile: false }));
    }
  }

  async function handleCoverUpload(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setLoading((current) => ({ ...current, coverUpload: true }));
    setStatus({ type: "", message: "" });

    try {
      const url = await uploadAsset(file, "covers");
      setProfileForm((current) => ({
        ...current,
        coverImage: url
      }));
      setStatus({ type: "success", message: "Cover uploaded. Save profile changes to publish it." });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading((current) => ({ ...current, coverUpload: false }));
    }
  }

  async function handleServiceImageUpload(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setLoading((current) => ({ ...current, serviceUpload: true }));
    setStatus({ type: "", message: "" });

    try {
      const url = await uploadAsset(file, "services");
      setServiceForm((current) => ({
        ...current,
        imageUrl: url
      }));
      setStatus({ type: "success", message: "Service image uploaded." });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading((current) => ({ ...current, serviceUpload: false }));
    }
  }

  async function handleAvailabilitySubmit(event) {
    event.preventDefault();
    setLoading((current) => ({ ...current, availability: true }));
    setStatus({ type: "", message: "" });

    try {
      const payload = availabilityForm.map((item) => ({
        dayOfWeek: Number(item.dayOfWeek),
        startTime: item.startTime,
        endTime: item.endTime,
        slotMinutes: Number(item.slotMinutes),
        active: item.active
      }));

      const hasInvalidRule = payload.some(
        (item) =>
          !item.startTime ||
          !item.endTime ||
          item.startTime >= item.endTime ||
          Number.isNaN(item.slotMinutes) ||
          item.slotMinutes < 15
      );

      if (hasInvalidRule) {
        throw new Error(
          "Each availability rule needs a valid day, a start time before the end time, and slots of at least 15 minutes."
        );
      }

      const response = await fetch("/api/dashboard/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availabilityRules: payload, blackoutDates: blackoutDatesText })
      });

      await refreshFromResponse(response);
      setStatus({ type: "success", message: "Availability updated." });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading((current) => ({ ...current, availability: false }));
    }
  }

  async function handleServiceSubmit(event) {
    event.preventDefault();
    setLoading((current) => ({ ...current, service: true }));
    setStatus({ type: "", message: "" });

    try {
      const response = await fetch(
        editingServiceId ? `/api/dashboard/services/${editingServiceId}` : "/api/dashboard/services",
        {
          method: editingServiceId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(serviceForm)
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to save service.");
      }

      setDashboard(data);
      setServiceForm(defaultServiceForm());
      setEditingServiceId("");
      setStatus({
        type: "success",
        message: editingServiceId ? "Service updated." : "Service added."
      });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading((current) => ({ ...current, service: false }));
    }
  }

  async function handleDeleteService(serviceId) {
    setLoading((current) => ({ ...current, deleteId: serviceId }));
    setStatus({ type: "", message: "" });

    try {
      const response = await fetch(`/api/dashboard/services/${serviceId}`, {
        method: "DELETE"
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to delete service.");
      }

      setDashboard(data);
      if (editingServiceId === serviceId) {
        setEditingServiceId("");
        setServiceForm(defaultServiceForm());
      }
      setStatus({ type: "success", message: "Service removed." });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading((current) => ({ ...current, deleteId: "" }));
    }
  }

  function startEditingService(service) {
    setEditingServiceId(service.id || service._id);
    setServiceForm({
      title: service.title || "",
      duration: service.duration || "",
      price: service.price || "",
      description: service.description || "",
      depositType: service.depositType || "percentage",
      depositValue: service.depositValue || 20,
      imageUrl: service.imageUrl || ""
    });
  }

  return (
    <div>
      <div className="section-heading">
        <span className="eyebrow">Vendor dashboard</span>
        <h1 style={{ fontSize: "clamp(2.6rem, 6vw, 4.8rem)" }}>{dashboard.vendor.name} workspace</h1>
        <p>
          Signed in as {user.email}. Manage your profile, services, cover image, and booking readiness from one place.
        </p>
      </div>

      <div className="booking-confirm" style={{ marginTop: 0 }}>
        <span className="muted">
          Marketplace status: <strong>{dashboard.vendor.status || "pending"}</strong>
          {" "}
          {dashboard.vendor.status === "active"
            ? "Your profile is visible in discovery."
            : dashboard.vendor.status === "rejected"
              ? "Your profile needs updates before it can go live."
              : "Your profile is waiting for admin approval before it appears publicly."}
        </span>
      </div>

      <div className="four-grid">
        {metrics.map((metric) => (
          <div key={metric.label} className="metric-card">
            <strong>{metric.value}</strong>
            <span className="muted">{metric.label}</span>
          </div>
        ))}
      </div>

      {status.message ? (
        <div
          className="booking-confirm"
          style={{
            background: status.type === "error" ? "rgba(255, 130, 130, 0.08)" : undefined,
            borderColor: status.type === "error" ? "rgba(255, 130, 130, 0.24)" : undefined
          }}
        >
          <span className="muted">{status.message}</span>
        </div>
      ) : null}

      <div className="dashboard-layout" style={{ marginTop: 18 }}>
        <div className="dashboard-card">
          <div className="row-between" style={{ marginBottom: 18 }}>
            <div>
              <div className="eyebrow">Public profile manager</div>
              <h3 style={{ margin: "10px 0 0", fontFamily: "var(--font-display)", fontSize: "2rem" }}>
                Update storefront content
              </h3>
            </div>
            <Link href={`/stylists/${dashboard.vendor.slug}`} className="button button-secondary">
              View live profile
            </Link>
          </div>

          <form className="form-grid" onSubmit={handleProfileSubmit}>
            <input
              className="form-control"
              placeholder="Business name"
              value={profileForm.name}
              onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })}
            />
            <input
              className="form-control"
              placeholder="Owner name"
              value={profileForm.owner}
              onChange={(event) => setProfileForm({ ...profileForm, owner: event.target.value })}
            />
            <input
              className="form-control"
              placeholder="Category"
              value={profileForm.category}
              onChange={(event) => setProfileForm({ ...profileForm, category: event.target.value })}
            />
            <input
              className="form-control"
              placeholder="City"
              value={profileForm.city}
              onChange={(event) => setProfileForm({ ...profileForm, city: event.target.value })}
            />
            <input
              className="form-control form-span-2"
              placeholder="Location"
              value={profileForm.location}
              onChange={(event) => setProfileForm({ ...profileForm, location: event.target.value })}
            />
            <input
              className="form-control form-span-2"
              placeholder="Hero tag"
              value={profileForm.heroTag}
              onChange={(event) => setProfileForm({ ...profileForm, heroTag: event.target.value })}
            />
            <input
              className="form-control form-span-2"
              placeholder="Tagline"
              value={profileForm.tagline}
              onChange={(event) => setProfileForm({ ...profileForm, tagline: event.target.value })}
            />
            <textarea
              className="form-control form-span-2"
              rows="4"
              placeholder="Bio"
              value={profileForm.bio}
              onChange={(event) => setProfileForm({ ...profileForm, bio: event.target.value })}
            />
            <input
              className="form-control form-span-2"
              placeholder="Specialties, comma separated"
              value={profileForm.specialties}
              onChange={(event) => setProfileForm({ ...profileForm, specialties: event.target.value })}
            />
            <input
              className="form-control form-span-2"
              placeholder="Amenities, comma separated"
              value={profileForm.amenities}
              onChange={(event) => setProfileForm({ ...profileForm, amenities: event.target.value })}
            />
            <input
              className="form-control form-span-2"
              placeholder="Cover image URL or upload below"
              value={profileForm.coverImage}
              onChange={(event) => setProfileForm({ ...profileForm, coverImage: event.target.value })}
            />
            <input
              className="form-control form-span-2"
              type="file"
              accept="image/*"
              onChange={handleCoverUpload}
            />
            {profileForm.coverImage ? (
              <div className="form-span-2 surface" style={{ padding: 14 }}>
                <img
                  src={profileForm.coverImage}
                  alt="Cover preview"
                  style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 18 }}
                />
              </div>
            ) : null}
            <button className="button button-primary form-span-2" disabled={loading.profile}>
              {loading.profile ? "Saving..." : "Save profile changes"}
            </button>
            {loading.coverUpload ? <span className="muted tiny">Uploading cover image...</span> : null}
          </form>
        </div>

        <div className="dashboard-card">
          <div className="eyebrow">Service manager</div>
          <h3 style={{ margin: "12px 0 16px", fontFamily: "var(--font-display)", fontSize: "2rem" }}>
            Add or edit bookable services
          </h3>
          <form className="form-grid" onSubmit={handleServiceSubmit}>
            <input
              className="form-control form-span-2"
              placeholder="Service title"
              value={serviceForm.title}
              onChange={(event) => setServiceForm({ ...serviceForm, title: event.target.value })}
            />
            <input
              className="form-control"
              placeholder="Duration"
              value={serviceForm.duration}
              onChange={(event) => setServiceForm({ ...serviceForm, duration: event.target.value })}
            />
            <input
              className="form-control"
              type="number"
              min="0"
              placeholder="Price"
              value={serviceForm.price}
              onChange={(event) => setServiceForm({ ...serviceForm, price: event.target.value })}
            />
            <select
              className="form-control"
              value={serviceForm.depositType}
              onChange={(event) => setServiceForm({ ...serviceForm, depositType: event.target.value })}
            >
              <option value="percentage">Deposit %</option>
              <option value="fixed">Fixed deposit</option>
            </select>
            <input
              className="form-control"
              type="number"
              min="0"
              placeholder="Deposit value"
              value={serviceForm.depositValue}
              onChange={(event) => setServiceForm({ ...serviceForm, depositValue: event.target.value })}
            />
            <input
              className="form-control form-span-2"
              placeholder="Service image URL"
              value={serviceForm.imageUrl}
              onChange={(event) => setServiceForm({ ...serviceForm, imageUrl: event.target.value })}
            />
            <input
              className="form-control form-span-2"
              type="file"
              accept="image/*"
              onChange={handleServiceImageUpload}
            />
            {serviceForm.imageUrl ? (
              <div className="form-span-2 surface" style={{ padding: 14 }}>
                <img
                  src={serviceForm.imageUrl}
                  alt="Service preview"
                  style={{ width: "100%", maxHeight: 180, objectFit: "cover", borderRadius: 18 }}
                />
              </div>
            ) : null}
            <textarea
              className="form-control form-span-2"
              rows="4"
              placeholder="Description"
              value={serviceForm.description}
              onChange={(event) => setServiceForm({ ...serviceForm, description: event.target.value })}
            />
            <div className="form-span-2 hero-actions">
              <button className="button button-primary" disabled={loading.service}>
                {loading.service ? "Saving..." : editingServiceId ? "Update service" : "Add service"}
              </button>
              {editingServiceId ? (
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => {
                    setEditingServiceId("");
                    setServiceForm(defaultServiceForm());
                  }}
                >
                  Cancel edit
                </button>
              ) : null}
            </div>
            {loading.serviceUpload ? <span className="muted tiny">Uploading service image...</span> : null}
          </form>
        </div>
      </div>

      <div className="dashboard-layout" style={{ marginTop: 18 }}>
        <div className="dashboard-card">
          <div className="row-between" style={{ marginBottom: 16 }}>
            <div>
              <div className="eyebrow">Availability editor</div>
              <h3 style={{ margin: "10px 0 0", fontFamily: "var(--font-display)", fontSize: "2rem" }}>
                Manage booking windows
              </h3>
            </div>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => setAvailabilityForm((current) => [...current, createAvailabilityItem()])}
            >
              Add day
            </button>
          </div>

          <form onSubmit={handleAvailabilitySubmit}>
            <div className="timeline">
              {availabilityForm.map((item, index) => (
                <div key={`rule-${index}`} className="timeline-item">
                  <div className="form-grid">
                    <select
                      className="form-control"
                      value={item.dayOfWeek}
                      onChange={(event) =>
                        setAvailabilityForm((current) =>
                          current.map((rule, ruleIndex) =>
                            ruleIndex === index ? { ...rule, dayOfWeek: event.target.value } : rule
                          )
                        )
                      }
                    >
                      {DAY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <input
                      className="form-control"
                      type="time"
                      value={item.startTime}
                      onChange={(event) =>
                        setAvailabilityForm((current) =>
                          current.map((rule, ruleIndex) =>
                            ruleIndex === index ? { ...rule, startTime: event.target.value } : rule
                          )
                        )
                      }
                    />
                    <input
                      className="form-control"
                      type="time"
                      value={item.endTime}
                      onChange={(event) =>
                        setAvailabilityForm((current) =>
                          current.map((rule, ruleIndex) =>
                            ruleIndex === index ? { ...rule, endTime: event.target.value } : rule
                          )
                        )
                      }
                    />
                    <input
                      className="form-control"
                      type="number"
                      min="15"
                      step="15"
                      placeholder="Slot length"
                      value={item.slotMinutes}
                      onChange={(event) =>
                        setAvailabilityForm((current) =>
                          current.map((rule, ruleIndex) =>
                            ruleIndex === index ? { ...rule, slotMinutes: event.target.value } : rule
                          )
                        )
                      }
                    />
                    <label
                      className="surface form-span-2"
                      style={{
                        padding: "14px 16px",
                        display: "flex",
                        alignItems: "center",
                        gap: 12
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={item.active}
                        onChange={(event) =>
                          setAvailabilityForm((current) =>
                            current.map((rule, ruleIndex) =>
                              ruleIndex === index ? { ...rule, active: event.target.checked } : rule
                            )
                          )
                        }
                      />
                      <span className="muted tiny">
                        This day is open for new bookings. Turn it off to keep the rule saved without showing slots.
                      </span>
                    </label>
                  </div>
                  <button
                    type="button"
                    className="button button-ghost"
                    style={{ marginTop: 12 }}
                    onClick={() =>
                      setAvailabilityForm((current) => current.filter((_, windowIndex) => windowIndex !== index))
                    }
                  >
                    Remove day
                  </button>
                </div>
              ))}
            </div>
            <div className="surface" style={{ marginTop: 16, padding: 18 }}>
              <div className="eyebrow">Blackout dates</div>
              <p className="muted tiny" style={{ margin: "10px 0 14px" }}>
                Add comma-separated dates like 2026-04-18, 2026-04-25 to hide those days from booking even when the weekly rule is active.
              </p>
              <input
                className="form-control"
                placeholder="2026-04-18, 2026-04-25"
                value={blackoutDatesText}
                onChange={(event) => setBlackoutDatesText(event.target.value)}
              />
            </div>
            <button className="button button-primary" style={{ marginTop: 18 }} disabled={loading.availability}>
              {loading.availability ? "Saving..." : "Save availability"}
            </button>
          </form>
        </div>

        <div className="dashboard-card">
          <div className="eyebrow">Live booking snapshot</div>
          <h3 style={{ margin: "12px 0 16px", fontFamily: "var(--font-display)", fontSize: "2rem" }}>
            Upcoming bookable dates
          </h3>
          <div className="timeline">
            {(dashboard.vendor.bookingWindows || []).length ? (
              (dashboard.vendor.bookingWindows || []).map((window) => (
                <div key={window.date} className="timeline-item">
                  <strong>{window.label}</strong>
                  <div className="slot-grid">
                    {window.slots.map((slot) => (
                      <span key={slot} className="chip">
                        {slot}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="timeline-item">
                <p className="muted" style={{ margin: 0 }}>
                  No public booking windows are live right now. Add an active weekly rule or clear a blackout date to reopen the calendar.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="dashboard-layout" style={{ marginTop: 18 }}>
        <div className="dashboard-card">
          <div className="row-between" style={{ marginBottom: 14 }}>
            <div>
              <div className="eyebrow">Published services</div>
              <h3 style={{ margin: "10px 0 0", fontFamily: "var(--font-display)", fontSize: "2rem" }}>
                Current booking menu
              </h3>
            </div>
            <span className="badge badge-accent">{services.length} live</span>
          </div>
          <div className="table-list">
            {services.length ? (
              services.map((service) => (
                <div key={service.id || service._id} className="table-item">
                  <div className="service-meta">
                    <div>
                      <strong>{service.title}</strong>
                      <p className="muted tiny" style={{ margin: "8px 0 0" }}>
                        {service.duration} - {service.depositType} {service.depositValue}
                      </p>
                    </div>
                    <strong>{formatCurrency(service.price)}</strong>
                  </div>
                  <p className="muted tiny" style={{ marginTop: 10 }}>
                    {service.description}
                  </p>
                  <div className="hero-actions" style={{ marginTop: 12 }}>
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => startEditingService(service)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="button button-ghost"
                      onClick={() => handleDeleteService(service.id || service._id)}
                      disabled={loading.deleteId === (service.id || service._id)}
                    >
                      {loading.deleteId === (service.id || service._id) ? "Removing..." : "Delete"}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="table-item">
                <p className="muted" style={{ margin: 0 }}>
                  Add your first service so clients can start booking.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-card">
          <div className="row-between" style={{ marginBottom: 14 }}>
            <div>
              <div className="eyebrow">Bookings and payments</div>
              <h3 style={{ margin: "10px 0 0", fontFamily: "var(--font-display)", fontSize: "2rem" }}>
                Recent appointment activity
              </h3>
            </div>
            <Link href={`/book/${dashboard.vendor.slug}`} className="button button-secondary">
              Test booking page
            </Link>
          </div>
          <div className="table-list">
            {bookings.length ? (
              bookings.map((booking) => (
                <div key={booking.id || `${booking.customerEmail}-${booking.appointmentDate}`} className="table-item">
                  <div className="service-meta">
                    <div>
                      <strong>{booking.customerName}</strong>
                      <p className="muted tiny" style={{ margin: "8px 0 0" }}>
                        {booking.serviceName}
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <strong>{booking.appointmentSlot}</strong>
                      <p className="muted tiny" style={{ margin: "8px 0 0" }}>
                        {booking.appointmentDate}
                      </p>
                    </div>
                  </div>
                  <div className="chip-row" style={{ marginTop: 12 }}>
                    <span className="chip">Total {formatCurrency(booking.total)}</span>
                    <span className="chip">Deposit {formatCurrency(booking.depositAmount || 0)}</span>
                    <span className="chip">{booking.paymentStatus}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="table-item">
                <p className="muted" style={{ margin: 0 }}>
                  No bookings yet. Once clients reserve slots, they&apos;ll appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
