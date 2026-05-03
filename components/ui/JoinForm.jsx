"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  Eye,
  EyeOff,
  House,
  ImagePlus,
  LoaderCircle,
  Smartphone,
  Sparkles,
  Store
} from "lucide-react";
import {
  SPECIALTY_OPTIONS,
  buildVendorAccountPayload,
  buildVendorAvailabilityPayload,
  buildVendorProfilePayload,
  inferVendorJoinStep
} from "@/lib/vendor-join-wizard";

const STEP_COUNT = 6;
const DEFAULT_START_TIME = "09:00";
const DEFAULT_END_TIME = "18:00";
const DAY_OPTIONS = [
  { id: "sun", label: "Sun" },
  { id: "mon", label: "Mon" },
  { id: "tue", label: "Tue" },
  { id: "wed", label: "Wed" },
  { id: "thu", label: "Thu" },
  { id: "fri", label: "Fri" },
  { id: "sat", label: "Sat" }
];
const DAY_INDEX = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6
};
const INDEX_TO_DAY = {
  0: "sun",
  1: "mon",
  2: "tue",
  3: "wed",
  4: "thu",
  5: "fri",
  6: "sat"
};
const TIMEZONE_OPTIONS = [
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "Europe/London",
  "Asia/Dubai",
  "Asia/Karachi"
];
const LOCATION_OPTIONS = [
  {
    id: "studio",
    label: "Salon",
    description: "Clients come to your suite, salon, or studio.",
    icon: Store
  },
  {
    id: "home",
    label: "Home",
    description: "You work from a home-based beauty space.",
    icon: House
  },
  {
    id: "mobile",
    label: "Mobile",
    description: "You travel to your clients for appointments.",
    icon: Smartphone
  }
];
const STEP_MEDIA = {
  1: {
    badge: "Free profile setup",
    title: "Clients near you are already searching for stylists like you",
    copy:
      "Create your Hair Force vendor account first, then move through the rest of the profile at your own pace.",
    image: "/business-promo/hairforce-business-promo.png"
  },
  2: {
    badge: "Step 2",
    title: "Introduce yourself",
    copy: "A polished business name and profile photo helps clients feel confident before they book.",
    image: "/featured-stylists/fresha-01.jpg"
  },
  3: {
    badge: "Step 3",
    title: "Show your work",
    copy: "Strong photos make your profile feel real, current, and bookable.",
    image: "/featured-stylists/fresha-02.jpg"
  },
  4: {
    badge: "Step 4",
    title: "Set your availability",
    copy: "Let clients see when you work and which timezone your schedule follows.",
    image: "/app-preview/trendy-studio.webp"
  },
  5: {
    badge: "Step 5",
    title: "Pick your specialties",
    copy: "Tell Hair Force what you want to be discovered for first.",
    image: "/featured-stylists/fresha-03.jpg"
  },
  6: {
    badge: "Step 6",
    title: "Share where you work",
    copy: "Location details help Hair Force match you with the right clients nearby.",
    image: "/featured-stylists/fresha-04.jpg"
  }
};
const SPECIALTY_IMAGES = [
  "/featured-stylists/fresha-01.jpg",
  "/featured-stylists/fresha-02.jpg",
  "/featured-stylists/fresha-03.jpg",
  "/featured-stylists/fresha-04.jpg",
  "/featured-stylists/fresha-05.jpg",
  "/featured-stylists/fresha-06.jpg",
  "/featured-stylists/fresha-07.jpg",
  "/featured-stylists/fresha-08.jpg",
  "/featured-stylists/fresha-09.jpg",
  "/how-it-works/get-styled-transform.jpeg"
];
const EMPTY_STATUS = { tone: "", message: "" };

const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const hours = Math.floor(index / 2);
  const minutes = index % 2 === 0 ? "00" : "30";
  const value = `${String(hours).padStart(2, "0")}:${minutes}`;
  const numericHours = hours % 12 || 12;
  const label = `${numericHours}:${minutes} ${hours >= 12 ? "PM" : "AM"}`;
  return { value, label };
});

function getBrowserTimezone() {
  if (typeof Intl === "undefined") {
    return "America/Los_Angeles";
  }

  return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Los_Angeles";
}

function cleanString(value) {
  return String(value || "").trim();
}

function splitName(name = "") {
  const parts = cleanString(name).split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" ")
  };
}

function sanitizeImageList(images) {
  return [...new Set((images || []).map((item) => cleanString(item)).filter(Boolean))];
}

function splitLocation(location = "") {
  const parts = cleanString(location).split(",").map((item) => item.trim()).filter(Boolean);

  return {
    addressLine1: parts[0] || "",
    addressLine2: parts.slice(1).join(", ")
  };
}

function buildInitialAccountForm(user = null) {
  const nameParts = splitName(user?.name);

  return {
    firstName: nameParts.firstName,
    lastName: nameParts.lastName,
    email: user?.email || "",
    password: "",
    phone: user?.phone || "",
    smsOptIn: Boolean(user?.smsOptIn),
    promoCode: user?.promoCode || ""
  };
}

function createEmptyCustomDayHours(startTime = DEFAULT_START_TIME, endTime = DEFAULT_END_TIME) {
  return DAY_OPTIONS.reduce((accumulator, day) => {
    accumulator[day.id] = {
      startTime,
      endTime
    };
    return accumulator;
  }, {});
}

function mapVendorToProfileForm(vendor = null) {
  return {
    businessName: vendor?.name || "",
    profileImage: vendor?.avatar || ""
  };
}

function mapVendorToPortfolioForm(vendor = null) {
  return {
    portfolioImages: sanitizeImageList(vendor?.portfolioImages || [])
  };
}

function mapVendorToAvailabilityForm(vendor = null, user = null) {
  const activeRules = Array.isArray(vendor?.availabilityRules)
    ? vendor.availabilityRules
        .filter((rule) => rule?.active !== false)
        .sort((left, right) => Number(left.dayOfWeek) - Number(right.dayOfWeek))
    : [];
  const selectedDays = activeRules
    .map((rule) => INDEX_TO_DAY[Number(rule.dayOfWeek)])
    .filter(Boolean);
  const firstRule = activeRules[0];
  const timeRanges = new Set(activeRules.map((rule) => `${rule.startTime}-${rule.endTime}`));
  const customDayHours = createEmptyCustomDayHours(
    firstRule?.startTime || DEFAULT_START_TIME,
    firstRule?.endTime || DEFAULT_END_TIME
  );

  activeRules.forEach((rule) => {
    const dayId = INDEX_TO_DAY[Number(rule.dayOfWeek)];

    if (!dayId) {
      return;
    }

    customDayHours[dayId] = {
      startTime: cleanString(rule.startTime) || DEFAULT_START_TIME,
      endTime: cleanString(rule.endTime) || DEFAULT_END_TIME
    };
  });

  return {
    selectedDays,
    startTime: cleanString(firstRule?.startTime) || DEFAULT_START_TIME,
    endTime: cleanString(firstRule?.endTime) || DEFAULT_END_TIME,
    timezone: cleanString(user?.timezone) || getBrowserTimezone(),
    customHoursEnabled: timeRanges.size > 1,
    customDayHours
  };
}

function mapVendorToSpecialtyForm(vendor = null) {
  return {
    specialtySelections: Array.isArray(vendor?.specialties) ? vendor.specialties.filter(Boolean) : []
  };
}

function mapVendorToLocationForm(vendor = null) {
  const locationParts = splitLocation(vendor?.location);

  return {
    locationType: cleanString(vendor?.serviceLocationType),
    addressLine1: locationParts.addressLine1,
    addressLine2: locationParts.addressLine2,
    city: vendor?.city || "",
    state: vendor?.state || "",
    area: vendor?.area || ""
  };
}

function buildInitialWizardState({ user = null, dashboard = null }) {
  const vendor = dashboard?.vendor || null;

  return {
    step: inferVendorJoinStep({ user, vendor }),
    account: buildInitialAccountForm(user),
    profile: mapVendorToProfileForm(vendor),
    portfolio: mapVendorToPortfolioForm(vendor),
    availability: mapVendorToAvailabilityForm(vendor, user),
    specialties: mapVendorToSpecialtyForm(vendor),
    location: mapVendorToLocationForm(vendor)
  };
}

function buildDraftDashboard(vendor) {
  return {
    kind: "vendor",
    vendor,
    services: [],
    bookings: [],
    conversations: [],
    notifications: [],
    unreadNotificationCount: 0,
    summary: null
  };
}

function isAccountFormReady(values) {
  return (
    cleanString(values.firstName) &&
    cleanString(values.lastName) &&
    cleanString(values.email) &&
    cleanString(values.phone) &&
    String(values.password || "").length >= 6
  );
}

function buildCustomAvailabilityPayload(values) {
  const selectedDays = Array.isArray(values.selectedDays) ? values.selectedDays : [];
  const availabilityRules = selectedDays
    .map((day) => ({
      dayOfWeek: DAY_INDEX[day],
      startTime: cleanString(values.customDayHours?.[day]?.startTime) || DEFAULT_START_TIME,
      endTime: cleanString(values.customDayHours?.[day]?.endTime) || DEFAULT_END_TIME,
      slotMinutes: 120,
      active: true
    }))
    .filter(
      (rule) =>
        rule.dayOfWeek !== undefined &&
        rule.startTime &&
        rule.endTime &&
        rule.startTime < rule.endTime
    );

  return {
    availabilityRules,
    timezone: cleanString(values.timezone)
  };
}

function getPrimaryLabel(step) {
  if (step === 1) {
    return "Get Started";
  }

  if (step === STEP_COUNT) {
    return "Finish Setup";
  }

  return "Next";
}

export default function JoinForm({ initialUser = null, initialDashboard = null }) {
  const router = useRouter();
  const formId = useId();
  const initialState = useMemo(
    () => buildInitialWizardState({ user: initialUser, dashboard: initialDashboard }),
    [initialDashboard, initialUser]
  );
  const [currentUser, setCurrentUser] = useState(initialUser);
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [currentStep, setCurrentStep] = useState(initialState.step);
  const [accountForm, setAccountForm] = useState(initialState.account);
  const [profileForm, setProfileForm] = useState(initialState.profile);
  const [portfolioForm, setPortfolioForm] = useState(initialState.portfolio);
  const [availabilityForm, setAvailabilityForm] = useState(initialState.availability);
  const [specialtyForm, setSpecialtyForm] = useState(initialState.specialties);
  const [locationForm, setLocationForm] = useState(initialState.location);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(EMPTY_STATUS);
  const [promoStatus, setPromoStatus] = useState(EMPTY_STATUS);
  const [uploading, setUploading] = useState({
    profile: false,
    portfolioIndex: null
  });

  const hasVendorAccount = currentUser?.role === "vendor";
  const stepMedia = STEP_MEDIA[currentStep];
  const progressWidth = Math.max(0, ((currentStep - 1) / (STEP_COUNT - 1)) * 100);
  const primaryDisabled = submitting || (currentStep === 1 && !isAccountFormReady(accountForm));
  const portfolioSlots = useMemo(() => {
    const next = [...portfolioForm.portfolioImages];
    const slotCount = Math.max(4, next.length + 1);

    while (next.length < slotCount) {
      next.push("");
    }

    return next;
  }, [portfolioForm.portfolioImages]);

  useEffect(() => {
    if (!availabilityForm.timezone) {
      setAvailabilityForm((current) => ({
        ...current,
        timezone: getBrowserTimezone()
      }));
    }
  }, [availabilityForm.timezone]);

  function applyVendorSnapshot(nextDashboard, nextUser = currentUser) {
    const nextVendor = nextDashboard?.vendor;

    if (!nextVendor) {
      return;
    }

    setDashboard(nextDashboard);
    setAccountForm((current) => ({
      ...buildInitialAccountForm(nextUser),
      password: current.password || ""
    }));
    setProfileForm(mapVendorToProfileForm(nextVendor));
    setPortfolioForm(mapVendorToPortfolioForm(nextVendor));
    setAvailabilityForm(mapVendorToAvailabilityForm(nextVendor, nextUser));
    setSpecialtyForm(mapVendorToSpecialtyForm(nextVendor));
    setLocationForm(mapVendorToLocationForm(nextVendor));
  }

  async function requestJson(url, options) {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Request failed.");
    }

    return data;
  }

  async function uploadAsset(file, folder) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);

    const response = await fetch("/api/uploads", {
      method: "POST",
      body: formData
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Unable to upload this image.");
    }

    return data.url;
  }

  async function persistProfileStep(payload, successMessage) {
    setSubmitting(true);
    setStatus(EMPTY_STATUS);

    try {
      const data = await requestJson("/api/dashboard/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      applyVendorSnapshot(data);
      setStatus({ tone: "success", message: successMessage });
      return data;
    } catch (error) {
      setStatus({ tone: "error", message: error.message });
      return null;
    } finally {
      setSubmitting(false);
    }
  }

  async function persistAvailabilityStep(payload, successMessage) {
    setSubmitting(true);
    setStatus(EMPTY_STATUS);

    try {
      const data = await requestJson("/api/dashboard/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      applyVendorSnapshot(data, currentUser);
      setStatus({ tone: "success", message: successMessage });
      return data;
    } catch (error) {
      setStatus({ tone: "error", message: error.message });
      return null;
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateAccount() {
    setSubmitting(true);
    setStatus(EMPTY_STATUS);

    try {
      const payload = buildVendorAccountPayload(accountForm);

      if (payload.password.length < 6) {
        throw new Error("Password must be at least six characters.");
      }

      const data = await requestJson("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const nextDashboard = buildDraftDashboard(data.vendor);

      setCurrentUser(data.user);
      setDashboard(nextDashboard);
      applyVendorSnapshot(nextDashboard, data.user);
      setAccountForm((current) => ({
        ...current,
        password: ""
      }));
      setStatus({ tone: "success", message: "Account created. Let's finish the rest of your stylist profile." });
      setCurrentStep(2);
    } catch (error) {
      setStatus({ tone: "error", message: error.message });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleProfileUpload(file) {
    if (!file) {
      return;
    }

    setUploading((current) => ({ ...current, profile: true }));
    setStatus(EMPTY_STATUS);

    try {
      const url = await uploadAsset(file, "avatars");
      setProfileForm((current) => ({
        ...current,
        profileImage: url
      }));
      setStatus({ tone: "success", message: "Profile image uploaded. Save this step to keep it." });
    } catch (error) {
      setStatus({ tone: "error", message: error.message });
    } finally {
      setUploading((current) => ({ ...current, profile: false }));
    }
  }

  async function handlePortfolioUpload(index, file) {
    if (!file) {
      return;
    }

    setUploading((current) => ({ ...current, portfolioIndex: index }));
    setStatus(EMPTY_STATUS);

    try {
      const url = await uploadAsset(file, "portfolio");
      setPortfolioForm((current) => {
        const nextImages = [...current.portfolioImages];

        if (index >= nextImages.length) {
          nextImages.push(url);
        } else {
          nextImages[index] = url;
        }

        return {
          portfolioImages: sanitizeImageList(nextImages)
        };
      });
      setStatus({ tone: "success", message: "Portfolio image uploaded. Save this step to keep it." });
    } catch (error) {
      setStatus({ tone: "error", message: error.message });
    } finally {
      setUploading((current) => ({ ...current, portfolioIndex: null }));
    }
  }

  async function handleStepSubmit(event) {
    event.preventDefault();

    if (currentStep === 1) {
      await handleCreateAccount();
      return;
    }

    if (!hasVendorAccount) {
      setStatus({ tone: "error", message: "Create your vendor account before continuing." });
      return;
    }

    if (currentStep === 2) {
      if (!cleanString(profileForm.businessName) || !cleanString(profileForm.profileImage)) {
        setStatus({ tone: "error", message: "Add a business name and profile picture, or use Skip for now." });
        return;
      }

      const data = await persistProfileStep(
        buildVendorProfilePayload({
          businessName: profileForm.businessName,
          profileImage: profileForm.profileImage
        }),
        "Your introduction is saved."
      );

      if (data) {
        setCurrentStep(3);
      }

      return;
    }

    if (currentStep === 3) {
      if (portfolioForm.portfolioImages.length < 4) {
        setStatus({ tone: "error", message: "Upload at least four photos, or use Skip to do it later." });
        return;
      }

      const data = await persistProfileStep(
        {
          portfolioImages: portfolioForm.portfolioImages
        },
        "Portfolio saved."
      );

      if (data) {
        setCurrentStep(4);
      }

      return;
    }

    if (currentStep === 4) {
      if (!availabilityForm.selectedDays.length || !cleanString(availabilityForm.timezone)) {
        setStatus({ tone: "error", message: "Choose at least one day and a timezone, or use Skip for now." });
        return;
      }

      const payload = availabilityForm.customHoursEnabled
        ? buildCustomAvailabilityPayload(availabilityForm)
        : buildVendorAvailabilityPayload(availabilityForm);

      if (!payload.availabilityRules.length) {
        setStatus({ tone: "error", message: "Add valid working hours before moving on." });
        return;
      }

      const data = await persistAvailabilityStep(payload, "Availability saved.");

      if (data) {
        setCurrentStep(5);
      }

      return;
    }

    if (currentStep === 5) {
      if (!specialtyForm.specialtySelections.length) {
        setStatus({ tone: "error", message: "Choose at least one specialty, or use Skip for now." });
        return;
      }

      const data = await persistProfileStep(
        buildVendorProfilePayload({
          specialtySelections: specialtyForm.specialtySelections
        }),
        "Specialties saved."
      );

      if (data) {
        setCurrentStep(6);
      }

      return;
    }

    if (!cleanString(locationForm.locationType) || !cleanString(locationForm.addressLine1)) {
      setStatus({ tone: "error", message: "Choose how you work and add an address, or use Skip for now." });
      return;
    }

    const payload = buildVendorProfilePayload({
      locationType: locationForm.locationType,
      addressLine1: locationForm.addressLine1,
      addressLine2: locationForm.addressLine2,
      city: locationForm.city,
      state: locationForm.state,
      area: locationForm.area
    });
    const data = await persistProfileStep(payload, "Location saved.");

    if (data) {
      router.push("/dashboard?section=profile");
      router.refresh();
    }
  }

  function handleSkip() {
    setStatus(EMPTY_STATUS);

    if (currentStep >= STEP_COUNT) {
      router.push("/dashboard?section=profile");
      router.refresh();
      return;
    }

    setCurrentStep((step) => Math.min(STEP_COUNT, step + 1));
  }

  function handleBack() {
    setStatus(EMPTY_STATUS);

    if (currentStep === 1 || (currentStep === 2 && hasVendorAccount)) {
      router.push("/");
      return;
    }

    setCurrentStep((step) => Math.max(1, step - 1));
  }

  function toggleDay(dayId) {
    setAvailabilityForm((current) => {
      const nextSelectedDays = current.selectedDays.includes(dayId)
        ? current.selectedDays.filter((item) => item !== dayId)
        : [...current.selectedDays, dayId].sort(
            (left, right) => Number(DAY_INDEX[left]) - Number(DAY_INDEX[right])
          );

      return {
        ...current,
        selectedDays: nextSelectedDays
      };
    });
  }

  function toggleSpecialty(option) {
    setSpecialtyForm((current) => ({
      specialtySelections: current.specialtySelections.includes(option)
        ? current.specialtySelections.filter((item) => item !== option)
        : [...current.specialtySelections, option]
    }));
  }

  function validatePromoCode() {
    const promoCode = cleanString(accountForm.promoCode);

    if (!promoCode) {
      setPromoStatus({ tone: "error", message: "Enter a promo code to validate it." });
      return;
    }

    if (/^[A-Z0-9-]{4,}$/i.test(promoCode)) {
      setPromoStatus({ tone: "success", message: "Promo code accepted. It will be saved with your account." });
      return;
    }

    setPromoStatus({ tone: "error", message: "That promo code format doesn't look right yet." });
  }

  function renderAccountStep() {
    return (
      <>
        <div className="vendor-join-copy-block">
          <span className="vendor-join-badge">{stepMedia.badge}</span>
          <h1 className="vendor-join-title">Clients near you are looking for you</h1>
          <p className="vendor-join-copy">
            Set up your Hair Force vendor account first. Once you&apos;re in, the remaining setup steps can be
            completed now or later.
          </p>
        </div>

        <div className="vendor-join-link-row">
          <span>Have an account?</span>
          <Link href="/vendor/signin">Log In</Link>
        </div>

        <div className="vendor-join-field-grid">
          <label className="vendor-join-field">
            <span className="vendor-join-label">First name</span>
            <input
              className="vendor-join-input"
              placeholder="Calvin"
              value={accountForm.firstName}
              onChange={(event) =>
                setAccountForm((current) => ({ ...current, firstName: event.target.value }))
              }
            />
          </label>
          <label className="vendor-join-field">
            <span className="vendor-join-label">Last name</span>
            <input
              className="vendor-join-input"
              placeholder="Palmer"
              value={accountForm.lastName}
              onChange={(event) =>
                setAccountForm((current) => ({ ...current, lastName: event.target.value }))
              }
            />
          </label>
          <label className="vendor-join-field vendor-join-field-span-2">
            <span className="vendor-join-label">Email</span>
            <input
              className="vendor-join-input"
              type="email"
              placeholder="calvinpalmer@email.com"
              value={accountForm.email}
              onChange={(event) =>
                setAccountForm((current) => ({ ...current, email: event.target.value }))
              }
            />
          </label>
          <label className="vendor-join-field vendor-join-field-span-2 vendor-join-password-field">
            <span className="vendor-join-label">Password</span>
            <input
              className="vendor-join-input vendor-join-input-with-icon"
              type={showPassword ? "text" : "password"}
              placeholder="Minimum six characters"
              value={accountForm.password}
              onChange={(event) =>
                setAccountForm((current) => ({ ...current, password: event.target.value }))
              }
            />
            <button
              type="button"
              className="vendor-join-input-icon"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </label>
          <label className="vendor-join-field vendor-join-field-span-2">
            <span className="vendor-join-label">Phone number</span>
            <input
              className="vendor-join-input"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={accountForm.phone}
              onChange={(event) =>
                setAccountForm((current) => ({ ...current, phone: event.target.value }))
              }
            />
          </label>
        </div>

        <button
          type="button"
          className={`vendor-join-toggle-row ${accountForm.smsOptIn ? "is-active" : ""}`}
          onClick={() =>
            setAccountForm((current) => ({
              ...current,
              smsOptIn: !current.smsOptIn
            }))
          }
        >
          <span>
            <strong>SMS updates</strong>
            <small>Receive booking and account updates on your phone.</small>
          </span>
          <span className="vendor-join-toggle">
            <span className="vendor-join-toggle-thumb" />
          </span>
        </button>

        <div className="vendor-join-promo-row">
          <label className="vendor-join-field">
            <span className="vendor-join-label">Promotion code</span>
            <input
              className="vendor-join-input"
              placeholder="Enter your promotion code"
              value={accountForm.promoCode}
              onChange={(event) =>
                setAccountForm((current) => ({ ...current, promoCode: event.target.value }))
              }
            />
          </label>
          <button type="button" className="vendor-join-validate" onClick={validatePromoCode}>
            Validate
          </button>
        </div>

        {promoStatus.message ? (
          <div className={`vendor-join-inline-status ${promoStatus.tone}`}>{promoStatus.message}</div>
        ) : null}

        <div className="vendor-join-legal">
          By creating your stylist account, you agree to receive account and booking-related updates from
          Hair Force. You can update your communication preferences later from your dashboard.
        </div>
      </>
    );
  }

  function renderProfileStep() {
    return (
      <>
        <div className="vendor-join-copy-block">
          <span className="vendor-join-step-label">Step 2 of 6</span>
          <h2 className="vendor-join-title">Introduce yourself</h2>
          <p className="vendor-join-copy">
            Clients love to know who they&apos;re booking with. Add a face and a business name they&apos;ll recognize.
          </p>
        </div>

        <div className="vendor-join-profile-upload">
          <label className="vendor-join-avatar-upload">
            <input type="file" accept="image/*" hidden onChange={(event) => handleProfileUpload(event.target.files?.[0])} />
            {profileForm.profileImage ? (
              <img src={profileForm.profileImage} alt="Vendor profile" className="vendor-join-avatar-preview" />
            ) : (
              <>
                {uploading.profile ? <LoaderCircle className="vendor-join-spin" size={30} /> : <Camera size={32} />}
                <span>{uploading.profile ? "Uploading..." : "Add photo"}</span>
              </>
            )}
          </label>
          <div>
            <strong>Add a profile picture</strong>
            <p className="vendor-join-microcopy">Save this step after uploading so it becomes part of your profile.</p>
          </div>
        </div>

        <div className="vendor-join-field-grid">
          <label className="vendor-join-field vendor-join-field-span-2">
            <span className="vendor-join-label">Business name</span>
            <input
              className="vendor-join-input"
              placeholder="Business name"
              value={profileForm.businessName}
              onChange={(event) =>
                setProfileForm((current) => ({ ...current, businessName: event.target.value }))
              }
            />
          </label>
        </div>
      </>
    );
  }

  function renderPortfolioStep() {
    return (
      <>
        <div className="vendor-join-copy-block">
          <span className="vendor-join-step-label">Step 3 of 6</span>
          <h2 className="vendor-join-title">Add photos of your work</h2>
          <p className="vendor-join-copy">
            Profiles with at least four strong photos usually convert better. You can always add more later from
            your profile section.
          </p>
        </div>

        <div className="vendor-join-portfolio-grid">
          {portfolioSlots.map((image, index) => (
            <div key={`portfolio-slot-${index}`} className="vendor-join-portfolio-tile">
              {image ? (
                <>
                  <img src={image} alt={`Portfolio sample ${index + 1}`} className="vendor-join-portfolio-image" />
                  <div className="vendor-join-portfolio-actions">
                    <label className="vendor-join-mini-button">
                      Replace
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(event) => handlePortfolioUpload(index, event.target.files?.[0])}
                      />
                    </label>
                    <button
                      type="button"
                      className="vendor-join-mini-button ghost"
                      onClick={() =>
                        setPortfolioForm((current) => ({
                          portfolioImages: current.portfolioImages.filter((_, itemIndex) => itemIndex !== index)
                        }))
                      }
                    >
                      Remove
                    </button>
                  </div>
                </>
              ) : (
                <label className="vendor-join-empty-tile">
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(event) => handlePortfolioUpload(index, event.target.files?.[0])}
                  />
                  {uploading.portfolioIndex === index ? (
                    <LoaderCircle className="vendor-join-spin" size={30} />
                  ) : (
                    <ImagePlus size={30} />
                  )}
                  <span>{uploading.portfolioIndex === index ? "Uploading..." : "Upload image"}</span>
                </label>
              )}
            </div>
          ))}
        </div>
      </>
    );
  }

  function renderAvailabilityStep() {
    return (
      <>
        <div className="vendor-join-copy-block">
          <span className="vendor-join-step-label">Step 4 of 6</span>
          <h2 className="vendor-join-title">What&apos;s your availability?</h2>
          <p className="vendor-join-copy">
            Pick the days you work most often, then decide whether you want one shared schedule or custom hours by
            day.
          </p>
        </div>

        <div className="vendor-join-tip">
          <Sparkles size={18} />
          <span>
            Pro tip: four or more days a week usually gives clients a better chance of finding you.
          </span>
        </div>

        <div className="vendor-join-day-grid">
          {DAY_OPTIONS.map((day) => (
            <button
              key={day.id}
              type="button"
              className={`vendor-join-day ${availabilityForm.selectedDays.includes(day.id) ? "is-selected" : ""}`}
              onClick={() => toggleDay(day.id)}
            >
              {day.label}
            </button>
          ))}
        </div>

        <div className="vendor-join-field-grid">
          <label className="vendor-join-field">
            <span className="vendor-join-label">Start time</span>
            <select
              className="vendor-join-input"
              value={availabilityForm.startTime}
              onChange={(event) =>
                setAvailabilityForm((current) => ({ ...current, startTime: event.target.value }))
              }
            >
              {TIME_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="vendor-join-field">
            <span className="vendor-join-label">End time</span>
            <select
              className="vendor-join-input"
              value={availabilityForm.endTime}
              onChange={(event) =>
                setAvailabilityForm((current) => ({ ...current, endTime: event.target.value }))
              }
            >
              {TIME_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="vendor-join-field vendor-join-field-span-2">
            <span className="vendor-join-label">Timezone</span>
            <select
              className="vendor-join-input"
              value={availabilityForm.timezone}
              onChange={(event) =>
                setAvailabilityForm((current) => ({ ...current, timezone: event.target.value }))
              }
            >
              <option value="">Please select a timezone</option>
              {TIMEZONE_OPTIONS.map((timezone) => (
                <option key={timezone} value={timezone}>
                  {timezone}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          type="button"
          className="vendor-join-customize"
          onClick={() =>
            setAvailabilityForm((current) => ({
              ...current,
              customHoursEnabled: !current.customHoursEnabled,
              customDayHours: Object.keys(current.customDayHours || {}).length
                ? current.customDayHours
                : createEmptyCustomDayHours(current.startTime, current.endTime)
            }))
          }
        >
          {availabilityForm.customHoursEnabled ? "Use one schedule for all selected days" : "Customize hours by day"}
        </button>

        {availabilityForm.customHoursEnabled ? (
          <div className="vendor-join-custom-hours">
            {availabilityForm.selectedDays.length ? (
              availabilityForm.selectedDays.map((dayId) => (
                <div key={dayId} className="vendor-join-custom-row">
                  <strong>{DAY_OPTIONS.find((item) => item.id === dayId)?.label || dayId}</strong>
                  <select
                    className="vendor-join-input"
                    value={availabilityForm.customDayHours[dayId]?.startTime || DEFAULT_START_TIME}
                    onChange={(event) =>
                      setAvailabilityForm((current) => ({
                        ...current,
                        customDayHours: {
                          ...current.customDayHours,
                          [dayId]: {
                            ...current.customDayHours[dayId],
                            startTime: event.target.value
                          }
                        }
                      }))
                    }
                  >
                    {TIME_OPTIONS.map((option) => (
                      <option key={`${dayId}-${option.value}-start`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <select
                    className="vendor-join-input"
                    value={availabilityForm.customDayHours[dayId]?.endTime || DEFAULT_END_TIME}
                    onChange={(event) =>
                      setAvailabilityForm((current) => ({
                        ...current,
                        customDayHours: {
                          ...current.customDayHours,
                          [dayId]: {
                            ...current.customDayHours[dayId],
                            endTime: event.target.value
                          }
                        }
                      }))
                    }
                  >
                    {TIME_OPTIONS.map((option) => (
                      <option key={`${dayId}-${option.value}-end`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))
            ) : (
              <p className="vendor-join-microcopy">Select one or more days first to customize their hours.</p>
            )}
          </div>
        ) : null}
      </>
    );
  }

  function renderSpecialtyStep() {
    return (
      <>
        <div className="vendor-join-copy-block">
          <span className="vendor-join-step-label">Step 5 of 6</span>
          <h2 className="vendor-join-title">Tell us your specialty</h2>
          <p className="vendor-join-copy">
            Choose every category you want Hair Force clients to see when they discover you.
          </p>
        </div>

        <div className="vendor-join-specialty-grid">
          {SPECIALTY_OPTIONS.map((option, index) => (
            <button
              key={option}
              type="button"
              className={`vendor-join-specialty-card ${
                specialtyForm.specialtySelections.includes(option) ? "is-selected" : ""
              }`}
              onClick={() => toggleSpecialty(option)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={SPECIALTY_IMAGES[index % SPECIALTY_IMAGES.length]} alt={option} />
              <div className="vendor-join-specialty-meta">
                <strong>{option}</strong>
                {specialtyForm.specialtySelections.includes(option) ? <Check size={16} /> : null}
              </div>
            </button>
          ))}
        </div>
      </>
    );
  }

  function renderLocationStep() {
    return (
      <>
        <div className="vendor-join-copy-block">
          <span className="vendor-join-step-label">Step 6 of 6</span>
          <h2 className="vendor-join-title">Where do you work?</h2>
          <p className="vendor-join-copy">
            Pick how clients book with you, then add the address details you want saved in your vendor profile.
          </p>
        </div>

        <div className="vendor-join-location-options">
          {LOCATION_OPTIONS.map((option) => {
            const Icon = option.icon;

            return (
              <button
                key={option.id}
                type="button"
                className={`vendor-join-location-card ${
                  locationForm.locationType === option.id ? "is-selected" : ""
                }`}
                onClick={() => setLocationForm((current) => ({ ...current, locationType: option.id }))}
              >
                <Icon size={28} />
                <strong>{option.label}</strong>
                <span>{option.description}</span>
              </button>
            );
          })}
        </div>

        <div className="vendor-join-field-grid">
          <label className="vendor-join-field vendor-join-field-span-2">
            <span className="vendor-join-label">Address</span>
            <input
              className="vendor-join-input"
              placeholder="e.g. 1500 Union Street"
              value={locationForm.addressLine1}
              onChange={(event) =>
                setLocationForm((current) => ({ ...current, addressLine1: event.target.value }))
              }
            />
          </label>
          <label className="vendor-join-field vendor-join-field-span-2">
            <span className="vendor-join-label">Suite, apt, etc. (optional)</span>
            <input
              className="vendor-join-input"
              placeholder="e.g. Suite #7"
              value={locationForm.addressLine2}
              onChange={(event) =>
                setLocationForm((current) => ({ ...current, addressLine2: event.target.value }))
              }
            />
          </label>
          <label className="vendor-join-field">
            <span className="vendor-join-label">City</span>
            <input
              className="vendor-join-input"
              placeholder="City"
              value={locationForm.city}
              onChange={(event) => setLocationForm((current) => ({ ...current, city: event.target.value }))}
            />
          </label>
          <label className="vendor-join-field">
            <span className="vendor-join-label">State</span>
            <input
              className="vendor-join-input"
              placeholder="State"
              value={locationForm.state}
              onChange={(event) =>
                setLocationForm((current) => ({ ...current, state: event.target.value }))
              }
            />
          </label>
          <label className="vendor-join-field vendor-join-field-span-2">
            <span className="vendor-join-label">Area or neighborhood</span>
            <input
              className="vendor-join-input"
              placeholder="Area or neighborhood"
              value={locationForm.area}
              onChange={(event) => setLocationForm((current) => ({ ...current, area: event.target.value }))}
            />
          </label>
        </div>
      </>
    );
  }

  function renderStepContent() {
    if (currentStep === 1) {
      return renderAccountStep();
    }

    if (currentStep === 2) {
      return renderProfileStep();
    }

    if (currentStep === 3) {
      return renderPortfolioStep();
    }

    if (currentStep === 4) {
      return renderAvailabilityStep();
    }

    if (currentStep === 5) {
      return renderSpecialtyStep();
    }

    return renderLocationStep();
  }

  return (
    <div className="vendor-join-shell">
      <header className="vendor-join-header">
        <Link href="/" className="vendor-join-brand" aria-label="Hair Force home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Hair Force" />
        </Link>
      </header>

      <div className="vendor-join-frame">
        <form id={formId} className="vendor-join-panel" onSubmit={handleStepSubmit}>
          {status.message ? (
            <div className={`vendor-join-status ${status.tone}`}>{status.message}</div>
          ) : null}

          {currentStep > 1 && currentUser ? (
            <div className="vendor-join-account-pill">
              <span>{currentUser.name || "Your account"}</span>
              <small>{currentUser.email}</small>
            </div>
          ) : null}

          {renderStepContent()}
        </form>

        <aside className="vendor-join-media">
          <div className="vendor-join-media-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={stepMedia.image} alt={stepMedia.title} className="vendor-join-media-image" />
            <div className="vendor-join-media-overlay" />

            {currentStep === 1 ? (
              <div className="vendor-join-stat-stack">
                <div className="vendor-join-stat-card primary">
                  <strong>75,000+</strong>
                  <span>beauty-service searches happened in major Hair Force markets last month</span>
                </div>
                <div className="vendor-join-stat-card secondary">
                  <strong>21,000+</strong>
                  <span>appointments were completed nearby through vendor profiles like yours</span>
                </div>
              </div>
            ) : (
              <div className="vendor-join-media-copy">
                <span>{stepMedia.badge}</span>
                <strong>{stepMedia.title}</strong>
                <p>{stepMedia.copy}</p>
              </div>
            )}
          </div>
        </aside>
      </div>

      <div className="vendor-join-footer">
        <div className="vendor-join-progress">
          <span className="vendor-join-progress-fill" style={{ width: `${progressWidth}%` }} />
        </div>

        <div className="vendor-join-footer-row">
          <button type="button" className="vendor-join-back" onClick={handleBack}>
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>

          <div className="vendor-join-footer-actions">
            {currentStep > 1 ? (
              <button type="button" className="vendor-join-skip" onClick={handleSkip}>
                Skip
              </button>
            ) : null}

            <button type="submit" form={formId} className="vendor-join-primary" disabled={primaryDisabled}>
              {submitting ? <LoaderCircle className="vendor-join-spin" size={18} /> : null}
              <span>{getPrimaryLabel(currentStep)}</span>
              {!submitting ? <ArrowRight size={18} /> : null}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
