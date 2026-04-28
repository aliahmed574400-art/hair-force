"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import SiteButton from "@/components/ui/SiteButton";
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

const SECTION_OPTIONS = [
  { id: "overview", label: "Overview" },
  { id: "profile", label: "Profile" },
  { id: "portfolio", label: "Portfolio" },
  { id: "services", label: "Services" },
  { id: "availability", label: "Availability" },
  { id: "bookings", label: "Bookings" },
  { id: "messages", label: "Messages" },
  { id: "settings", label: "Settings" }
];

function defaultServiceForm() {
  return {
    title: "",
    duration: "",
    price: "",
    description: "",
    depositType: "percentage",
    depositValue: 20,
    imageUrl: "",
    featured: false,
    bookingMethod: "instant",
    isActive: true
  };
}

function createProfileForm(vendor) {
  return {
    name: vendor.name || "",
    owner: vendor.owner || "",
    category: vendor.category || "",
    state: vendor.state || "",
    city: vendor.city || "",
    area: vendor.area || "",
    location: vendor.location || "",
    heroTag: vendor.heroTag || "",
    tagline: vendor.tagline || "",
    bio: vendor.bio || "",
    coverImage: vendor.coverImage || "",
    avatar: vendor.avatar || "",
    specialties: (vendor.specialties || []).join(", "),
    amenities: (vendor.amenities || []).join(", "),
    serviceLocationType: vendor.serviceLocationType || "studio",
    portfolioImages: vendor.portfolioImages || [],
    policies: {
      deposit: vendor.policies?.deposit || "",
      cancellation: vendor.policies?.cancellation || "",
      lateArrival: vendor.policies?.lateArrival || "",
      prepInstructions: vendor.policies?.prepInstructions || ""
    },
    socialLinks: {
      instagram: vendor.socialLinks?.instagram || "",
      website: vendor.socialLinks?.website || "",
      tiktok: vendor.socialLinks?.tiktok || "",
      facebook: vendor.socialLinks?.facebook || ""
    }
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

function bookingStatusTone(status) {
  if (status === "pending_approval") {
    return "warning";
  }

  if (status === "confirmed") {
    return "success";
  }

  if (status === "completed") {
    return "muted";
  }

  return "muted";
}

function formatDateLabel(value) {
  if (!value) {
    return "Date pending";
  }

  const parsed = new Date(`${String(value).slice(0, 10)}T12:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-PK", {
    weekday: "short",
    day: "numeric",
    month: "short"
  });
}

function sortBookings(bookings) {
  return [...bookings].sort((left, right) => {
    const leftTime = new Date(`${left.appointmentDate}T12:00:00`).getTime();
    const rightTime = new Date(`${right.appointmentDate}T12:00:00`).getTime();
    return rightTime - leftTime;
  });
}

function initialThreadState() {
  return {
    loading: false,
    sending: false,
    error: "",
    messages: [],
    draft: ""
  };
}

function sanitizePortfolioImages(images) {
  return [...new Set((images || []).map((item) => String(item || "").trim()).filter(Boolean))];
}

export default function VendorDashboardManager({ user, initialData }) {
  const [dashboard, setDashboard] = useState(initialData);
  const [activeSection, setActiveSection] = useState("overview");
  const [profileForm, setProfileForm] = useState(createProfileForm(initialData.vendor));
  const [availabilityForm, setAvailabilityForm] = useState(createAvailabilityForm(initialData.vendor));
  const [blackoutDatesText, setBlackoutDatesText] = useState(
    (initialData.vendor.blackoutDates || []).join(", ")
  );
  const [serviceForm, setServiceForm] = useState(defaultServiceForm());
  const [editingServiceId, setEditingServiceId] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [activeConversationId, setActiveConversationId] = useState(initialData.conversations?.[0]?.id || "");
  const [threadState, setThreadState] = useState(initialThreadState());
  const [rescheduleState, setRescheduleState] = useState({
    bookingId: "",
    loading: false,
    error: "",
    windows: [],
    selectedDate: "",
    selectedSlot: ""
  });
  const [loading, setLoading] = useState({
    profile: false,
    availability: false,
    service: false,
    bookingAction: "",
    coverUpload: false,
    avatarUpload: false,
    serviceUpload: false,
    portfolioUpload: false
  });

  const bookings = dashboard.bookings || [];
  const services = dashboard.services || [];
  const conversations = dashboard.conversations || [];
  const pendingBookings = useMemo(
    () => sortBookings(bookings.filter((booking) => booking.status === "pending_approval")),
    [bookings]
  );
  const confirmedBookings = useMemo(
    () => sortBookings(bookings.filter((booking) => booking.status === "confirmed")),
    [bookings]
  );
  const completedBookings = useMemo(
    () => sortBookings(bookings.filter((booking) => booking.status === "completed")),
    [bookings]
  );
  const closedBookings = useMemo(
    () => sortBookings(bookings.filter((booking) => ["cancelled", "declined"].includes(booking.status))),
    [bookings]
  );
  const metrics = useMemo(
    () => [
      { label: "Revenue", value: formatCurrency(dashboard.summary?.revenue || 0) },
      { label: "Bookings today", value: dashboard.summary?.bookingsToday || 0 },
      { label: "Pending requests", value: pendingBookings.length },
      { label: "Unread threads", value: conversations.reduce((sum, item) => sum + Number(item.vendorUnreadCount || 0), 0) }
    ],
    [conversations, dashboard.summary, pendingBookings.length]
  );
  const activeConversation = conversations.find((item) => item.id === activeConversationId) || null;

  useEffect(() => {
    setDashboard(initialData);
  }, [initialData]);

  useEffect(() => {
    setProfileForm(createProfileForm(dashboard.vendor));
    setAvailabilityForm(createAvailabilityForm(dashboard.vendor));
    setBlackoutDatesText((dashboard.vendor.blackoutDates || []).join(", "));
  }, [dashboard]);

  useEffect(() => {
    if (!activeConversationId && conversations.length) {
      setActiveConversationId(conversations[0].id);
    }
  }, [activeConversationId, conversations]);

  useEffect(() => {
    if (activeSection !== "messages" || !activeConversationId) {
      return;
    }

    loadConversation(activeConversationId);
  }, [activeConversationId, activeSection]);

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

  function profilePayload(formState = profileForm) {
    return {
      name: formState.name,
      owner: formState.owner,
      category: formState.category,
      state: formState.state,
      city: formState.city,
      area: formState.area,
      location: formState.location,
      heroTag: formState.heroTag,
      tagline: formState.tagline,
      bio: formState.bio,
      coverImage: formState.coverImage,
      avatar: formState.avatar,
      specialties: formState.specialties,
      amenities: formState.amenities,
      serviceLocationType: formState.serviceLocationType,
      portfolioImages: sanitizePortfolioImages(formState.portfolioImages),
      policies: formState.policies,
      socialLinks: formState.socialLinks
    };
  }

  async function saveProfileChanges(nextForm = profileForm, successMessage = "Profile updated.") {
    setLoading((current) => ({ ...current, profile: true }));
    setStatus({ type: "", message: "" });

    try {
      const response = await fetch("/api/dashboard/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profilePayload(nextForm))
      });

      await refreshFromResponse(response);
      setStatus({ type: "success", message: successMessage });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading((current) => ({ ...current, profile: false }));
    }
  }

  async function handleProfileSubmit(event) {
    event.preventDefault();
    await saveProfileChanges(profileForm);
  }

  async function handleImageUpload(field, folder, file, loadingKey) {
    if (!file) {
      return;
    }

    setLoading((current) => ({ ...current, [loadingKey]: true }));
    setStatus({ type: "", message: "" });

    try {
      const url = await uploadAsset(file, folder);
      setProfileForm((current) => ({ ...current, [field]: url }));
      setStatus({ type: "success", message: "Image uploaded. Save profile changes to publish it." });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading((current) => ({ ...current, [loadingKey]: false }));
    }
  }

  async function handlePortfolioUpload(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setLoading((current) => ({ ...current, portfolioUpload: true }));
    setStatus({ type: "", message: "" });

    try {
      const url = await uploadAsset(file, "portfolio");
      setProfileForm((current) => ({
        ...current,
        portfolioImages: sanitizePortfolioImages([...(current.portfolioImages || []), url])
      }));
      setStatus({ type: "success", message: "Portfolio image uploaded. Save portfolio changes to publish it." });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading((current) => ({ ...current, portfolioUpload: false }));
    }
  }

  function updatePolicy(field, value) {
    setProfileForm((current) => ({
      ...current,
      policies: {
        ...current.policies,
        [field]: value
      }
    }));
  }

  function updateSocialLink(field, value) {
    setProfileForm((current) => ({
      ...current,
      socialLinks: {
        ...current.socialLinks,
        [field]: value
      }
    }));
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

  async function handleServiceImageUpload(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setLoading((current) => ({ ...current, serviceUpload: true }));
    setStatus({ type: "", message: "" });

    try {
      const url = await uploadAsset(file, "services");
      setServiceForm((current) => ({ ...current, imageUrl: url }));
      setStatus({ type: "success", message: "Service image uploaded." });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading((current) => ({ ...current, serviceUpload: false }));
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
      setStatus({ type: "success", message: editingServiceId ? "Service updated." : "Service added." });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading((current) => ({ ...current, service: false }));
    }
  }

  async function handleDeleteService(serviceId) {
    setLoading((current) => ({ ...current, bookingAction: serviceId }));
    setStatus({ type: "", message: "" });

    try {
      const response = await fetch(`/api/dashboard/services/${serviceId}`, { method: "DELETE" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to delete service.");
      }

      setDashboard(data);
      setStatus({ type: "success", message: "Service removed." });
      if (editingServiceId === serviceId) {
        setEditingServiceId("");
        setServiceForm(defaultServiceForm());
      }
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading((current) => ({ ...current, bookingAction: "" }));
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
      imageUrl: service.imageUrl || "",
      featured: Boolean(service.featured),
      bookingMethod: service.bookingMethod || "instant",
      isActive: service.isActive !== false
    });
    setActiveSection("services");
  }

  async function performBookingAction(bookingId, payload, successMessage) {
    setLoading((current) => ({ ...current, bookingAction: bookingId }));
    setStatus({ type: "", message: "" });

    try {
      const response = await fetch(`/api/dashboard/vendor-bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      await refreshFromResponse(response);
      setStatus({ type: "success", message: successMessage });
      setRescheduleState({
        bookingId: "",
        loading: false,
        error: "",
        windows: [],
        selectedDate: "",
        selectedSlot: ""
      });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading((current) => ({ ...current, bookingAction: "" }));
    }
  }

  async function openReschedule(bookingId) {
    setRescheduleState({
      bookingId,
      loading: true,
      error: "",
      windows: [],
      selectedDate: "",
      selectedSlot: ""
    });

    try {
      const response = await fetch(`/api/dashboard/vendor-bookings/${bookingId}/availability`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load availability.");
      }

      const firstWindow = data.windows?.[0] || null;
      setRescheduleState({
        bookingId,
        loading: false,
        error: "",
        windows: data.windows || [],
        selectedDate: firstWindow?.date || "",
        selectedSlot: firstWindow?.slots?.[0] || ""
      });
    } catch (error) {
      setRescheduleState({
        bookingId,
        loading: false,
        error: error.message,
        windows: [],
        selectedDate: "",
        selectedSlot: ""
      });
    }
  }

  async function refreshConversations() {
    const response = await fetch("/api/dashboard/messages");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Unable to load conversations.");
    }

    setDashboard((current) => ({ ...current, conversations: data.conversations || [] }));
    return data.conversations || [];
  }

  async function loadConversation(conversationId) {
    if (!conversationId) {
      return;
    }

    setThreadState((current) => ({ ...current, loading: true, error: "" }));

    try {
      const response = await fetch(`/api/dashboard/messages/${conversationId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load conversation.");
      }

      setThreadState((current) => ({
        ...current,
        loading: false,
        messages: data.messages || [],
        error: ""
      }));
      await refreshConversations();
    } catch (error) {
      setThreadState((current) => ({ ...current, loading: false, error: error.message }));
    }
  }

  async function openConversationForBooking(bookingId) {
    setActiveSection("messages");

    try {
      const response = await fetch("/api/dashboard/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to open conversation.");
      }

      setActiveConversationId(data.conversation?.id || "");
      setThreadState((current) => ({
        ...current,
        messages: data.messages || [],
        error: "",
        loading: false
      }));
      await refreshConversations();
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    }
  }

  async function sendMessage(event) {
    event.preventDefault();

    if (!activeConversationId || !threadState.draft.trim()) {
      return;
    }

    setThreadState((current) => ({ ...current, sending: true, error: "" }));

    try {
      const response = await fetch(`/api/dashboard/messages/${activeConversationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: threadState.draft })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to send message.");
      }

      setThreadState((current) => ({
        ...current,
        sending: false,
        draft: "",
        messages: data.messages || [],
        error: ""
      }));
      await refreshConversations();
    } catch (error) {
      setThreadState((current) => ({ ...current, sending: false, error: error.message }));
    }
  }

  return (
    <div>
      <div className="section-heading">
        <span className="eyebrow">Vendor dashboard</span>
        <h1 style={{ fontSize: "clamp(2.6rem, 6vw, 4.8rem)" }}>{dashboard.vendor.name} workspace</h1>
        <p>
          Signed in as {user.email}. Manage your profile, services, live availability, bookings, and client messages from one workspace.
        </p>
      </div>

      <div className="booking-confirm" style={{ marginTop: 0 }}>
        <span className="muted">
          Marketplace status: <strong>{dashboard.vendor.status || "pending"}</strong>{" "}
          {dashboard.vendor.status === "active"
            ? "Your profile is visible in discovery."
            : dashboard.vendor.status === "rejected"
              ? "Your profile needs updates before it can go live."
              : "Your profile is waiting for admin approval before it appears publicly."}
        </span>
      </div>

      <div className="vendor-dashboard-tabs">
        {SECTION_OPTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            className={`vendor-dashboard-tab ${activeSection === section.id ? "active" : ""}`}
            onClick={() => setActiveSection(section.id)}
          >
            {section.label}
            {section.id === "bookings" ? <span>{pendingBookings.length}</span> : null}
            {section.id === "messages" ? (
              <span>{conversations.reduce((sum, item) => sum + Number(item.vendorUnreadCount || 0), 0)}</span>
            ) : null}
          </button>
        ))}
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

      {activeSection === "overview" ? (
        <div className="dashboard-layout" style={{ marginTop: 18 }}>
          <div className="dashboard-card">
            <div className="eyebrow">Snapshot</div>
            <h3 style={{ margin: "12px 0 16px", fontFamily: "var(--font-display)", fontSize: "2rem" }}>
              Business overview
            </h3>
            <div className="timeline">
              <div className="timeline-item">
                <strong>Pending approvals</strong>
                <p className="muted tiny" style={{ margin: "8px 0 0" }}>
                  {pendingBookings.length
                    ? `${pendingBookings.length} booking request(s) need a decision.`
                    : "No pending requests right now."}
                </p>
              </div>
              <div className="timeline-item">
                <strong>Portfolio status</strong>
                <p className="muted tiny" style={{ margin: "8px 0 0" }}>
                  {profileForm.portfolioImages.length
                    ? `${profileForm.portfolioImages.length} portfolio image(s) are ready on the public profile.`
                    : "Add portfolio images to build more trust on the public profile."}
                </p>
              </div>
              <div className="timeline-item">
                <strong>Message inbox</strong>
                <p className="muted tiny" style={{ margin: "8px 0 0" }}>
                  {conversations.length
                    ? `${conversations.reduce((sum, item) => sum + Number(item.vendorUnreadCount || 0), 0)} unread message(s) across ${conversations.length} conversation(s).`
                    : "Messages open automatically when bookings are created."}
                </p>
              </div>
            </div>
            <div className="hero-actions" style={{ marginTop: 18 }}>
              <SiteButton href={`/stylists/${dashboard.vendor.slug}`}>View live profile</SiteButton>
              <SiteButton href={`/book/${dashboard.vendor.slug}`} variant="secondary">
                Test booking page
              </SiteButton>
            </div>
          </div>

          <div className="dashboard-card">
            <div className="eyebrow">Upcoming slots</div>
            <h3 style={{ margin: "12px 0 16px", fontFamily: "var(--font-display)", fontSize: "2rem" }}>
              Live calendar preview
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
                    No public booking windows are live right now.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {activeSection === "profile" ? (
        <div className="dashboard-card vendor-dashboard-panel" style={{ marginTop: 18 }}>
          <div className="row-between" style={{ marginBottom: 18 }}>
            <div>
              <div className="eyebrow">Public profile manager</div>
              <h3 style={{ margin: "10px 0 0", fontFamily: "var(--font-display)", fontSize: "2rem" }}>
                Update storefront content
              </h3>
            </div>
            <SiteButton href={`/stylists/${dashboard.vendor.slug}`} variant="secondary">
              View live profile
            </SiteButton>
          </div>

          <form className="form-grid" onSubmit={handleProfileSubmit}>
            <input className="form-control" placeholder="Business name" value={profileForm.name} onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })} />
            <input className="form-control" placeholder="Owner name" value={profileForm.owner} onChange={(event) => setProfileForm({ ...profileForm, owner: event.target.value })} />
            <input className="form-control" placeholder="Category" value={profileForm.category} onChange={(event) => setProfileForm({ ...profileForm, category: event.target.value })} />
            <input className="form-control" placeholder="State (for example, New York)" value={profileForm.state} onChange={(event) => setProfileForm({ ...profileForm, state: event.target.value })} />
            <input className="form-control" placeholder="City (for example, Brooklyn)" value={profileForm.city} onChange={(event) => setProfileForm({ ...profileForm, city: event.target.value })} />
            <input className="form-control" placeholder="Area or neighborhood" value={profileForm.area} onChange={(event) => setProfileForm({ ...profileForm, area: event.target.value })} />
            <input className="form-control form-span-2" placeholder="Store location or address" value={profileForm.location} onChange={(event) => setProfileForm({ ...profileForm, location: event.target.value })} />
            <div className="surface form-span-2" style={{ padding: "16px 18px", display: "grid", gap: 10 }}>
              <strong>Discovery map pin</strong>
              <span className="muted tiny">
                Just type your store location and save. Hair Force will geocode it on save and use that saved pin on the discovery map.
              </span>
              {dashboard.vendor.latitude !== null && dashboard.vendor.latitude !== undefined ? (
                <span className="badge">
                  Saved pin: {dashboard.vendor.latitude}, {dashboard.vendor.longitude}
                </span>
              ) : (
                <span className="muted tiny">
                  No saved map pin yet. Add your location and save this profile to place it on discover.
                </span>
              )}
            </div>
            <input className="form-control form-span-2" placeholder="Hero tag" value={profileForm.heroTag} onChange={(event) => setProfileForm({ ...profileForm, heroTag: event.target.value })} />
            <input className="form-control form-span-2" placeholder="Tagline" value={profileForm.tagline} onChange={(event) => setProfileForm({ ...profileForm, tagline: event.target.value })} />
            <textarea className="form-control form-span-2" rows="4" placeholder="Bio" value={profileForm.bio} onChange={(event) => setProfileForm({ ...profileForm, bio: event.target.value })} />
            <input className="form-control form-span-2" placeholder="Specialties, comma separated" value={profileForm.specialties} onChange={(event) => setProfileForm({ ...profileForm, specialties: event.target.value })} />
            <input className="form-control form-span-2" placeholder="Amenities, comma separated" value={profileForm.amenities} onChange={(event) => setProfileForm({ ...profileForm, amenities: event.target.value })} />
            <select className="form-control form-span-2" value={profileForm.serviceLocationType} onChange={(event) => setProfileForm({ ...profileForm, serviceLocationType: event.target.value })}>
              <option value="studio">Studio visit</option>
              <option value="home">Home service</option>
              <option value="both">Studio + home service</option>
            </select>
            <input className="form-control form-span-2" placeholder="Cover image URL or upload below" value={profileForm.coverImage} onChange={(event) => setProfileForm({ ...profileForm, coverImage: event.target.value })} />
            <input className="form-control form-span-2" type="file" accept="image/*" onChange={(event) => handleImageUpload("coverImage", "covers", event.target.files?.[0], "coverUpload")} />
            <input className="form-control form-span-2" placeholder="Profile image URL or upload below" value={profileForm.avatar} onChange={(event) => setProfileForm({ ...profileForm, avatar: event.target.value })} />
            <input className="form-control form-span-2" type="file" accept="image/*" onChange={(event) => handleImageUpload("avatar", "avatars", event.target.files?.[0], "avatarUpload")} />

            <textarea className="form-control form-span-2" rows="3" placeholder="Deposit policy" value={profileForm.policies.deposit} onChange={(event) => updatePolicy("deposit", event.target.value)} />
            <textarea className="form-control form-span-2" rows="3" placeholder="Cancellation policy" value={profileForm.policies.cancellation} onChange={(event) => updatePolicy("cancellation", event.target.value)} />
            <textarea className="form-control form-span-2" rows="3" placeholder="Late arrival policy" value={profileForm.policies.lateArrival} onChange={(event) => updatePolicy("lateArrival", event.target.value)} />
            <textarea className="form-control form-span-2" rows="3" placeholder="Prep instructions" value={profileForm.policies.prepInstructions} onChange={(event) => updatePolicy("prepInstructions", event.target.value)} />

            <input className="form-control" placeholder="Instagram URL" value={profileForm.socialLinks.instagram} onChange={(event) => updateSocialLink("instagram", event.target.value)} />
            <input className="form-control" placeholder="Website URL" value={profileForm.socialLinks.website} onChange={(event) => updateSocialLink("website", event.target.value)} />
            <input className="form-control" placeholder="TikTok URL" value={profileForm.socialLinks.tiktok} onChange={(event) => updateSocialLink("tiktok", event.target.value)} />
            <input className="form-control" placeholder="Facebook URL" value={profileForm.socialLinks.facebook} onChange={(event) => updateSocialLink("facebook", event.target.value)} />

            <SiteButton className="form-span-2" disabled={loading.profile} fullWidth type="submit">
              {loading.profile ? "Saving..." : "Save profile changes"}
            </SiteButton>
          </form>
        </div>
      ) : null}

      {activeSection === "portfolio" ? (
        <div className="dashboard-card vendor-dashboard-panel" style={{ marginTop: 18 }}>
          <div className="row-between" style={{ marginBottom: 18 }}>
            <div>
              <div className="eyebrow">Portfolio manager</div>
              <h3 style={{ margin: "10px 0 0", fontFamily: "var(--font-display)", fontSize: "2rem" }}>
                Publish real work samples
              </h3>
            </div>
            <input type="file" accept="image/*" onChange={handlePortfolioUpload} />
          </div>

          <div className="vendor-portfolio-grid">
            {profileForm.portfolioImages.length ? (
              profileForm.portfolioImages.map((image, index) => (
                <div key={`${image}-${index}`} className="vendor-portfolio-item">
                  <img src={image} alt={`Portfolio ${index + 1}`} className="vendor-portfolio-image" />
                  <div className="hero-actions" style={{ marginTop: 12 }}>
                    <SiteButton
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        setProfileForm((current) => {
                          const next = [...current.portfolioImages];
                          if (index > 0) {
                            [next[index - 1], next[index]] = [next[index], next[index - 1]];
                          }
                          return { ...current, portfolioImages: next };
                        })
                      }
                    >
                      Up
                    </SiteButton>
                    <SiteButton
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        setProfileForm((current) => {
                          const next = [...current.portfolioImages];
                          if (index < next.length - 1) {
                            [next[index], next[index + 1]] = [next[index + 1], next[index]];
                          }
                          return { ...current, portfolioImages: next };
                        })
                      }
                    >
                      Down
                    </SiteButton>
                    <SiteButton
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setProfileForm((current) => ({
                          ...current,
                          portfolioImages: current.portfolioImages.filter((_, itemIndex) => itemIndex !== index)
                        }))
                      }
                    >
                      Remove
                    </SiteButton>
                  </div>
                </div>
              ))
            ) : (
              <div className="timeline-item">
                <p className="muted" style={{ margin: 0 }}>
                  Upload portfolio images to replace placeholder gallery content on the public profile.
                </p>
              </div>
            )}
          </div>

          <SiteButton style={{ marginTop: 18 }} onClick={() => saveProfileChanges(profileForm, "Portfolio updated.")} disabled={loading.profile}>
            {loading.profile ? "Saving..." : "Save portfolio"}
          </SiteButton>
        </div>
      ) : null}

      {activeSection === "services" ? (
        <div className="dashboard-layout" style={{ marginTop: 18 }}>
          <div className="dashboard-card">
            <div className="eyebrow">Service manager</div>
            <h3 style={{ margin: "12px 0 16px", fontFamily: "var(--font-display)", fontSize: "2rem" }}>
              Add or edit bookable services
            </h3>
            <form className="form-grid" onSubmit={handleServiceSubmit}>
              <input className="form-control form-span-2" placeholder="Service title" value={serviceForm.title} onChange={(event) => setServiceForm({ ...serviceForm, title: event.target.value })} />
              <input className="form-control" placeholder="Duration" value={serviceForm.duration} onChange={(event) => setServiceForm({ ...serviceForm, duration: event.target.value })} />
              <input className="form-control" type="number" min="0" placeholder="Price" value={serviceForm.price} onChange={(event) => setServiceForm({ ...serviceForm, price: event.target.value })} />
              <select className="form-control" value={serviceForm.depositType} onChange={(event) => setServiceForm({ ...serviceForm, depositType: event.target.value })}>
                <option value="percentage">Deposit %</option>
                <option value="fixed">Fixed deposit</option>
              </select>
              <input className="form-control" type="number" min="0" placeholder="Deposit value" value={serviceForm.depositValue} onChange={(event) => setServiceForm({ ...serviceForm, depositValue: event.target.value })} />
              <select className="form-control" value={serviceForm.bookingMethod} onChange={(event) => setServiceForm({ ...serviceForm, bookingMethod: event.target.value })}>
                <option value="instant">Instant booking</option>
                <option value="approval">Approval required</option>
              </select>
              <label className="surface" style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                <input type="checkbox" checked={serviceForm.featured} onChange={(event) => setServiceForm({ ...serviceForm, featured: event.target.checked })} />
                <span className="muted tiny">Show in top services on the profile.</span>
              </label>
              <label className="surface form-span-2" style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                <input type="checkbox" checked={serviceForm.isActive} onChange={(event) => setServiceForm({ ...serviceForm, isActive: event.target.checked })} />
                <span className="muted tiny">Keep this service visible and bookable on the public profile.</span>
              </label>
              <input className="form-control form-span-2" placeholder="Service image URL" value={serviceForm.imageUrl} onChange={(event) => setServiceForm({ ...serviceForm, imageUrl: event.target.value })} />
              <input className="form-control form-span-2" type="file" accept="image/*" onChange={handleServiceImageUpload} />
              <textarea className="form-control form-span-2" rows="4" placeholder="Description" value={serviceForm.description} onChange={(event) => setServiceForm({ ...serviceForm, description: event.target.value })} />
              <div className="form-span-2 hero-actions">
                <SiteButton disabled={loading.service} type="submit">
                  {loading.service ? "Saving..." : editingServiceId ? "Update service" : "Add service"}
                </SiteButton>
                {editingServiceId ? (
                  <SiteButton type="button" variant="secondary" onClick={() => {
                    setEditingServiceId("");
                    setServiceForm(defaultServiceForm());
                  }}>
                    Cancel edit
                  </SiteButton>
                ) : null}
              </div>
            </form>
          </div>

          <div className="dashboard-card">
            <div className="row-between" style={{ marginBottom: 14 }}>
              <div>
                <div className="eyebrow">Published services</div>
                <h3 style={{ margin: "10px 0 0", fontFamily: "var(--font-display)", fontSize: "2rem" }}>
                  Current booking menu
                </h3>
              </div>
              <span className="badge badge-accent">{services.length} total</span>
            </div>
            <div className="table-list">
              {services.length ? (
                services.map((service) => (
                  <div key={service.id || service._id} className="table-item">
                    <div className="service-meta">
                      <div>
                        <strong>{service.title}</strong>
                        <p className="muted tiny" style={{ margin: "8px 0 0" }}>
                          {service.duration} · {service.bookingMethod === "approval" ? "Approval required" : "Instant booking"}
                        </p>
                      </div>
                      <strong>{formatCurrency(service.price)}</strong>
                    </div>
                    <div className="chip-row" style={{ marginTop: 12 }}>
                      <span className="chip">{service.featured ? "Featured" : "Standard"}</span>
                      <span className="chip">{service.isActive !== false ? "Active" : "Hidden"}</span>
                      <span className="chip">Deposit {service.depositType} {service.depositValue}</span>
                    </div>
                    <p className="muted tiny" style={{ marginTop: 10 }}>{service.description}</p>
                    <div className="hero-actions" style={{ marginTop: 12 }}>
                      <SiteButton onClick={() => startEditingService(service)} type="button" variant="secondary">
                        Edit
                      </SiteButton>
                      <SiteButton onClick={() => handleDeleteService(service.id || service._id)} disabled={loading.bookingAction === (service.id || service._id)} type="button" variant="ghost">
                        {loading.bookingAction === (service.id || service._id) ? "Removing..." : "Delete"}
                      </SiteButton>
                    </div>
                  </div>
                ))
              ) : (
                <div className="table-item">
                  <p className="muted" style={{ margin: 0 }}>Add your first service so clients can start booking.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {activeSection === "availability" ? (
        <div className="dashboard-layout" style={{ marginTop: 18 }}>
          <div className="dashboard-card">
            <div className="row-between" style={{ marginBottom: 16 }}>
              <div>
                <div className="eyebrow">Availability editor</div>
                <h3 style={{ margin: "10px 0 0", fontFamily: "var(--font-display)", fontSize: "2rem" }}>
                  Manage booking windows
                </h3>
              </div>
              <SiteButton onClick={() => setAvailabilityForm((current) => [...current, createAvailabilityItem()])} type="button" variant="secondary">
                Add day
              </SiteButton>
            </div>

            <form onSubmit={handleAvailabilitySubmit}>
              <div className="timeline">
                {availabilityForm.map((item, index) => (
                  <div key={`rule-${index}`} className="timeline-item">
                    <div className="form-grid">
                      <select className="form-control" value={item.dayOfWeek} onChange={(event) => setAvailabilityForm((current) => current.map((rule, ruleIndex) => ruleIndex === index ? { ...rule, dayOfWeek: event.target.value } : rule))}>
                        {DAY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <input className="form-control" type="time" value={item.startTime} onChange={(event) => setAvailabilityForm((current) => current.map((rule, ruleIndex) => ruleIndex === index ? { ...rule, startTime: event.target.value } : rule))} />
                      <input className="form-control" type="time" value={item.endTime} onChange={(event) => setAvailabilityForm((current) => current.map((rule, ruleIndex) => ruleIndex === index ? { ...rule, endTime: event.target.value } : rule))} />
                      <input className="form-control" type="number" min="15" step="15" placeholder="Slot length" value={item.slotMinutes} onChange={(event) => setAvailabilityForm((current) => current.map((rule, ruleIndex) => ruleIndex === index ? { ...rule, slotMinutes: event.target.value } : rule))} />
                      <label className="surface form-span-2" style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                        <input type="checkbox" checked={item.active} onChange={(event) => setAvailabilityForm((current) => current.map((rule, ruleIndex) => ruleIndex === index ? { ...rule, active: event.target.checked } : rule))} />
                        <span className="muted tiny">
                          This day is open for new bookings. Turn it off to keep the rule saved without showing slots.
                        </span>
                      </label>
                    </div>
                    <SiteButton style={{ marginTop: 12 }} onClick={() => setAvailabilityForm((current) => current.filter((_, windowIndex) => windowIndex !== index))} type="button" variant="ghost">
                      Remove day
                    </SiteButton>
                  </div>
                ))}
              </div>
              <div className="surface" style={{ marginTop: 16, padding: 18 }}>
                <div className="eyebrow">Blackout dates</div>
                <p className="muted tiny" style={{ margin: "10px 0 14px" }}>
                  Add comma-separated dates like 2026-04-18, 2026-04-25 to hide those days from booking even when the weekly rule is active.
                </p>
                <input className="form-control" placeholder="2026-04-18, 2026-04-25" value={blackoutDatesText} onChange={(event) => setBlackoutDatesText(event.target.value)} />
              </div>
              <SiteButton disabled={loading.availability} style={{ marginTop: 18 }} type="submit">
                {loading.availability ? "Saving..." : "Save availability"}
              </SiteButton>
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
                      {window.slots.map((slotItem) => (
                        <span key={slotItem} className="chip">
                          {slotItem}
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
      ) : null}

      {activeSection === "bookings" ? (
        <div className="vendor-dashboard-bookings" style={{ marginTop: 18 }}>
          {[
            ["Pending approvals", pendingBookings],
            ["Confirmed bookings", confirmedBookings],
            ["Completed bookings", completedBookings],
            ["Closed bookings", closedBookings]
          ].map(([label, group]) => (
            <div key={label} className="dashboard-card vendor-dashboard-panel">
              <div className="row-between" style={{ marginBottom: 14 }}>
                <div>
                  <div className="eyebrow">{label}</div>
                  <h3 style={{ margin: "10px 0 0", fontFamily: "var(--font-display)", fontSize: "2rem" }}>
                    {label}
                  </h3>
                </div>
                <span className="badge badge-accent">{group.length}</span>
              </div>

              <div className="table-list">
                {group.length ? (
                  group.map((booking) => (
                    <div key={booking.id} className="table-item">
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
                            {formatDateLabel(booking.appointmentDate)}
                          </p>
                        </div>
                      </div>

                      <div className="chip-row" style={{ marginTop: 12 }}>
                        <span className={`chip vendor-status-chip ${bookingStatusTone(booking.status)}`}>{booking.status}</span>
                        <span className="chip">Total {formatCurrency(booking.total)}</span>
                        <span className="chip">Payment {booking.paymentStatus}</span>
                      </div>

                      <div className="hero-actions" style={{ marginTop: 14 }}>
                        {booking.status === "pending_approval" ? (
                          <>
                            <SiteButton type="button" size="sm" onClick={() => performBookingAction(booking.id, { action: "approve" }, "Booking request approved.")}>
                              Approve
                            </SiteButton>
                            <SiteButton type="button" size="sm" variant="secondary" onClick={() => performBookingAction(booking.id, { action: "decline", reason: "Unable to accommodate the requested time." }, "Booking request declined.")}>
                              Decline
                            </SiteButton>
                          </>
                        ) : null}

                        {booking.status === "confirmed" ? (
                          <>
                            <SiteButton type="button" size="sm" variant="secondary" onClick={() => openReschedule(booking.id)}>
                              Reschedule
                            </SiteButton>
                            <SiteButton type="button" size="sm" onClick={() => performBookingAction(booking.id, { action: "complete" }, "Booking marked as completed.")}>
                              Complete
                            </SiteButton>
                            <SiteButton type="button" size="sm" variant="ghost" onClick={() => performBookingAction(booking.id, { action: "cancel", reason: "Cancelled by stylist." }, "Booking cancelled.")}>
                              Cancel
                            </SiteButton>
                          </>
                        ) : null}

                        <SiteButton type="button" size="sm" variant="secondary" onClick={() => openConversationForBooking(booking.id)}>
                          Message client
                        </SiteButton>
                      </div>

                      {rescheduleState.bookingId === booking.id ? (
                        <div className="vendor-reschedule-panel">
                          {rescheduleState.loading ? <p className="muted tiny">Loading availability...</p> : null}
                          {rescheduleState.error ? <p className="muted tiny">{rescheduleState.error}</p> : null}
                          {rescheduleState.windows.length ? (
                            <>
                              <div className="slot-grid" style={{ marginTop: 12 }}>
                                {rescheduleState.windows.map((window) => (
                                  <button
                                    key={window.date}
                                    type="button"
                                    className={`vendor-inline-pill ${rescheduleState.selectedDate === window.date ? "active" : ""}`}
                                    onClick={() =>
                                      setRescheduleState((current) => ({
                                        ...current,
                                        selectedDate: window.date,
                                        selectedSlot: window.slots[0] || ""
                                      }))
                                    }
                                  >
                                    {window.label}
                                  </button>
                                ))}
                              </div>
                              <div className="slot-grid" style={{ marginTop: 12 }}>
                                {(rescheduleState.windows.find((window) => window.date === rescheduleState.selectedDate)?.slots || []).map((slotItem) => (
                                  <button
                                    key={slotItem}
                                    type="button"
                                    className={`vendor-inline-pill ${rescheduleState.selectedSlot === slotItem ? "active" : ""}`}
                                    onClick={() => setRescheduleState((current) => ({ ...current, selectedSlot: slotItem }))}
                                  >
                                    {slotItem}
                                  </button>
                                ))}
                              </div>
                              <div className="hero-actions" style={{ marginTop: 12 }}>
                                <SiteButton
                                  type="button"
                                  size="sm"
                                  onClick={() =>
                                    performBookingAction(
                                      booking.id,
                                      {
                                        action: "reschedule",
                                        appointmentDate: rescheduleState.selectedDate,
                                        appointmentSlot: rescheduleState.selectedSlot
                                      },
                                      "Booking rescheduled."
                                    )
                                  }
                                >
                                  Confirm new time
                                </SiteButton>
                                <SiteButton
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setRescheduleState({ bookingId: "", loading: false, error: "", windows: [], selectedDate: "", selectedSlot: "" })}
                                >
                                  Close
                                </SiteButton>
                              </div>
                            </>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="table-item">
                    <p className="muted" style={{ margin: 0 }}>Nothing to show in this section yet.</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {activeSection === "messages" ? (
        <div className="vendor-dashboard-messages" style={{ marginTop: 18 }}>
          <div className="dashboard-card vendor-dashboard-messages-list">
            <div className="eyebrow">Conversations</div>
            <h3 style={{ margin: "12px 0 16px", fontFamily: "var(--font-display)", fontSize: "2rem" }}>
              Booking inbox
            </h3>
            <div className="timeline">
              {conversations.length ? (
                conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    className={`vendor-conversation-card ${activeConversationId === conversation.id ? "active" : ""}`}
                    onClick={() => setActiveConversationId(conversation.id)}
                  >
                    <div className="row-between">
                      <strong>{conversation.customerName || "Client"}</strong>
                      <span className="chip">{conversation.vendorUnreadCount || 0} unread</span>
                    </div>
                    <p className="muted tiny" style={{ margin: "8px 0 0" }}>
                      {conversation.serviceName} · {formatDateLabel(conversation.appointmentDate)}
                    </p>
                    <p className="muted tiny" style={{ margin: "8px 0 0" }}>
                      {conversation.lastMessagePreview || "Open the thread to send the first update."}
                    </p>
                  </button>
                ))
              ) : (
                <div className="timeline-item">
                  <p className="muted" style={{ margin: 0 }}>Conversations will appear here after bookings are created.</p>
                </div>
              )}
            </div>
          </div>

          <div className="dashboard-card vendor-dashboard-messages-thread">
            <div className="row-between" style={{ marginBottom: 16 }}>
              <div>
                <div className="eyebrow">Selected thread</div>
                <h3 style={{ margin: "10px 0 0", fontFamily: "var(--font-display)", fontSize: "2rem" }}>
                  {activeConversation ? activeConversation.customerName : "Choose a conversation"}
                </h3>
                {activeConversation ? (
                  <p className="muted tiny" style={{ margin: "8px 0 0" }}>
                    {activeConversation.serviceName} · {formatDateLabel(activeConversation.appointmentDate)} · {activeConversation.appointmentSlot}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="vendor-message-thread">
              {threadState.loading ? <p className="muted tiny">Loading conversation...</p> : null}
              {threadState.error ? <p className="muted tiny">{threadState.error}</p> : null}
              {!threadState.loading && activeConversation && threadState.messages.length ? (
                threadState.messages.map((message) => (
                  <div key={message.id} className={`vendor-message-bubble ${message.senderRole === "vendor" ? "mine" : ""}`}>
                    <strong>{message.senderRole === "vendor" ? "You" : activeConversation.customerName}</strong>
                    <p style={{ margin: "8px 0 0" }}>{message.body}</p>
                  </div>
                ))
              ) : !threadState.loading && activeConversation ? (
                <p className="muted tiny">No messages yet. Send the first update from this thread.</p>
              ) : (
                <p className="muted tiny">Select a booking conversation to start messaging.</p>
              )}
            </div>

            {activeConversation ? (
              <form onSubmit={sendMessage} className="vendor-message-form">
                <textarea className="form-control" rows="4" placeholder="Message the client about arrival time, prep instructions, or changes to the booking." value={threadState.draft} onChange={(event) => setThreadState((current) => ({ ...current, draft: event.target.value }))} />
                <SiteButton type="submit" disabled={threadState.sending}>
                  {threadState.sending ? "Sending..." : "Send message"}
                </SiteButton>
              </form>
            ) : null}
          </div>
        </div>
      ) : null}

      {activeSection === "settings" ? (
        <div className="dashboard-layout" style={{ marginTop: 18 }}>
          <div className="dashboard-card">
            <div className="eyebrow">Settings</div>
            <h3 style={{ margin: "12px 0 16px", fontFamily: "var(--font-display)", fontSize: "2rem" }}>
              Workspace controls
            </h3>
            <div className="timeline">
              <div className="timeline-item">
                <strong>Public profile</strong>
                <p className="muted tiny" style={{ margin: "8px 0 0" }}>
                  Your public profile is generated from this dashboard. Update your bio, policies, images, services, and availability here.
                </p>
              </div>
              <div className="timeline-item">
                <strong>Booking mode mix</strong>
                <p className="muted tiny" style={{ margin: "8px 0 0" }}>
                  Use instant booking for standard services and approval-required mode for appointments that need consultation or manual review.
                </p>
              </div>
              <div className="timeline-item">
                <strong>Messaging</strong>
                <p className="muted tiny" style={{ margin: "8px 0 0" }}>
                  Conversations are attached to bookings so only the stylist and booked client can access the thread.
                </p>
              </div>
            </div>
          </div>

          <div className="dashboard-card">
            <div className="eyebrow">Quick links</div>
            <h3 style={{ margin: "12px 0 16px", fontFamily: "var(--font-display)", fontSize: "2rem" }}>
              Jump to live flows
            </h3>
            <div className="timeline">
              <div className="timeline-item">
                <Link href={`/stylists/${dashboard.vendor.slug}`} className="muted tiny">
                  Open public stylist profile
                </Link>
              </div>
              <div className="timeline-item">
                <Link href={`/book/${dashboard.vendor.slug}`} className="muted tiny">
                  Open booking page
                </Link>
              </div>
              <div className="timeline-item">
                <button type="button" className="vendor-inline-link" onClick={() => setActiveSection("messages")}>
                  Open booking inbox
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
