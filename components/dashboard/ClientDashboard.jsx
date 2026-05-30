"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  CalendarDays,
  ChevronRight,
  Clock3,
  Heart,
  Image as ImageIcon,
  ImagePlus,
  Info,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  MapPin,
  MessageSquareText,
  MoreHorizontal,
  Paperclip,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Smile,
  Sparkles,
  UserRound,
  Video,
  Wallet,
  X
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { parseMediaUrl, formatMessageTime, formatMessageDate, isSameDay } from "@/lib/chat-helpers";
import MessengerWidget from "@/components/ui/MessengerWidget";

const TAB_OPTIONS = [
  { id: "overview", label: "Dashboard", icon: LayoutDashboard },
  { id: "bookings", label: "Bookings", icon: CalendarDays },
  { id: "payments", label: "Payments", icon: Wallet },
  { id: "favorites", label: "Saved Stylists", icon: Heart },
  { id: "messages", label: "Messages", icon: MessageSquareText },
  { id: "profile", label: "Account", icon: UserRound }
];

const HEADER_COPY = {
  overview: {
    title: "Dashboard",
    subtitle: "Welcome back to your dashboard"
  },
  bookings: {
    title: "My Bookings",
    subtitle: "Manage upcoming visits, rebook quickly, and review past appointments"
  },
  payments: {
    title: "Payments",
    subtitle: "Manage saved cards, clear booking dues, and review your receipts"
  },
  favorites: {
    title: "Saved Stylists",
    subtitle: "Keep your preferred stylists close so your next booking is faster"
  },
  messages: {
    title: "Messages",
    subtitle: "Only booked-client conversations with your stylists appear here"
  },
  profile: {
    title: "Profile & Security",
    subtitle: "Update your details, review linked methods, and protect your account"
  }
};

const PAYMENT_SECTION_OPTIONS = [
  { id: "overview", label: "Overview" },
  { id: "methods", label: "Saved Methods" },
  { id: "history", label: "Payment History" },
  { id: "receipts", label: "Receipts & Policy" }
];

const BOOKING_SECTION_OPTIONS = [
  { id: "upcoming", label: "Upcoming Appointments" },
  { id: "past", label: "Past Visits" }
];

const AVATAR_EDITOR_FRAME_SIZE = 320;
const AVATAR_EDITOR_EXPORT_SIZE = 512;

const ACCOUNT_SECTION_OPTIONS = [
  { id: "details", label: "Profile Details" },
  { id: "security", label: "Security & Linked Methods" },
  { id: "password", label: "Change Password" },
  { id: "preferences", label: "Preferences" }
];

const PREFERENCE_OPTIONS = [
  {
    key: "bookingUpdates",
    label: "Booking updates",
    description: "Confirmations, cancellations, and reschedules."
  },
  {
    key: "reminders",
    label: "Reminders",
    description: "Upcoming appointment reminders and payment follow-ups."
  },
  {
    key: "recommendations",
    label: "Recommendations",
    description: "Saved stylist nudges and new suggestions."
  },
  {
    key: "securityAlerts",
    label: "Security alerts",
    description: "Password and account change notices."
  }
];

function getValidTab(value) {
  return TAB_OPTIONS.some((item) => item.id === value) ? value : "overview";
}

function createProfileForm(profile, user) {
  const source = profile || user || {};
  return {
    name: source.name || "",
    email: source.email || "",
    phone: source.phone || "",
    city: source.city || "",
    avatar: source.avatar || ""
  };
}

function createPreferenceForm(preferences) {
  return {
    bookingUpdates: preferences?.bookingUpdates !== false,
    reminders: preferences?.reminders !== false,
    recommendations: preferences?.recommendations !== false,
    securityAlerts: preferences?.securityAlerts !== false
  };
}

function createPaymentMethodForm() {
  return {
    holderName: "",
    brand: "Visa",
    last4: "",
    expMonth: "",
    expYear: "",
    isDefault: false
  };
}

function createAvatarEditorState() {
  return {
    open: false,
    source: "",
    fileName: "",
    imageWidth: 0,
    imageHeight: 0,
    offsetX: 0,
    offsetY: 0,
    scale: 1,
    brightness: 100,
    contrast: 100,
    processing: false,
    error: ""
  };
}

function createMessageThreadState() {
  return {
    loading: false,
    sending: false,
    error: "",
    messages: [],
    draft: ""
  };
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Unable to read that image file."));
    reader.readAsDataURL(file);
  });
}

function loadImageDimensions(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () =>
      resolve({
        width: image.naturalWidth || image.width || 0,
        height: image.naturalHeight || image.height || 0
      });
    image.onerror = () => reject(new Error("Unable to open that image file."));
    image.src = source;
  });
}

function getAvatarEditorMetrics(imageWidth, imageHeight, frameSize, scale = 1) {
  const safeWidth = Math.max(1, Number(imageWidth) || 1);
  const safeHeight = Math.max(1, Number(imageHeight) || 1);
  const baseScale = Math.max(frameSize / safeWidth, frameSize / safeHeight);

  return {
    renderedWidth: safeWidth * baseScale * scale,
    renderedHeight: safeHeight * baseScale * scale
  };
}

function normalizeAvatarEditorState(state) {
  if (!state?.open) {
    return state;
  }

  const { renderedWidth, renderedHeight } = getAvatarEditorMetrics(
    state.imageWidth,
    state.imageHeight,
    AVATAR_EDITOR_FRAME_SIZE,
    state.scale
  );
  const maxOffsetX = Math.max(0, (renderedWidth - AVATAR_EDITOR_FRAME_SIZE) / 2);
  const maxOffsetY = Math.max(0, (renderedHeight - AVATAR_EDITOR_FRAME_SIZE) / 2);

  return {
    ...state,
    offsetX: Math.min(maxOffsetX, Math.max(-maxOffsetX, state.offsetX || 0)),
    offsetY: Math.min(maxOffsetY, Math.max(-maxOffsetY, state.offsetY || 0))
  };
}

function renderAvatarEditorImage(editorState) {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = AVATAR_EDITOR_EXPORT_SIZE;
      canvas.height = AVATAR_EDITOR_EXPORT_SIZE;

      const context = canvas.getContext("2d");

      if (!context) {
        reject(new Error("Unable to prepare the profile image."));
        return;
      }

      const { renderedWidth, renderedHeight } = getAvatarEditorMetrics(
        image.naturalWidth || editorState.imageWidth,
        image.naturalHeight || editorState.imageHeight,
        AVATAR_EDITOR_EXPORT_SIZE,
        editorState.scale
      );
      const previewRatio = AVATAR_EDITOR_EXPORT_SIZE / AVATAR_EDITOR_FRAME_SIZE;
      const drawX =
        (AVATAR_EDITOR_EXPORT_SIZE - renderedWidth) / 2 + (editorState.offsetX || 0) * previewRatio;
      const drawY =
        (AVATAR_EDITOR_EXPORT_SIZE - renderedHeight) / 2 + (editorState.offsetY || 0) * previewRatio;

      context.filter = `brightness(${editorState.brightness}%) contrast(${editorState.contrast}%)`;
      context.drawImage(image, drawX, drawY, renderedWidth, renderedHeight);
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };

    image.onerror = () => reject(new Error("Unable to process that image."));
    image.src = editorState.source;
  });
}

function formatAppointmentDate(value) {
  if (!value) {
    return "Date pending";
  }

  const parsed = new Date(`${String(value).slice(0, 10)}T12:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function formatNotificationDate(value) {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short"
  });
}

function formatPaymentDate(value) {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function formatSessionDateTime(value) {
  if (!value) {
    return "Just now";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Just now";
  }

  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function bookingTone(booking) {
  if (booking.status === "cancelled") {
    return "muted";
  }

  if (
    booking.paymentStatus === "deposit_due" ||
    booking.paymentStatus === "pay_later" ||
    booking.paymentStatus === "failed"
  ) {
    return "warning";
  }

  return "success";
}

function bookingStatusLabel(booking) {
  if (booking.status === "cancelled") {
    return "Cancelled";
  }

  if (booking.paymentStatus === "deposit_due") {
    return "Deposit due";
  }

  if (booking.paymentStatus === "pay_later") {
    return "Pay later";
  }

  if (booking.paymentStatus === "deposit_paid") {
    return "Deposit paid";
  }

  if (booking.paymentStatus === "paid_in_full") {
    return "Paid in full";
  }

  if (booking.paymentStatus === "failed") {
    return "Payment failed";
  }

  return booking.status || "Confirmed";
}

function paymentStatusTone(status) {
  if (status === "succeeded") {
    return "success";
  }

  if (status === "failed") {
    return "warning";
  }

  return "muted";
}

function paymentStatusLabel(status) {
  if (status === "succeeded") {
    return "Paid";
  }

  if (status === "failed") {
    return "Failed";
  }

  if (status === "pending") {
    return "Pending";
  }

  return status || "Update";
}

function paymentMethodLabel(method) {
  if (!method) {
    return "No saved card";
  }

  return `${method.brand} ending in ${method.last4}`;
}

function linkedMethodLabel(method) {
  return method.connected ? `${method.label} linked` : `${method.label} not linked`;
}

function metricTone(id) {
  if (id === "appointments") {
    return "blue";
  }

  if (id === "payments") {
    return "green";
  }

  if (id === "favorites") {
    return "violet";
  }

  return "orange";
}

function progressTone(id) {
  if (id === "read") {
    return "orange";
  }

  if (id === "account") {
    return "green";
  }

  return "blue";
}

function getInitials(value) {
  return String(value || "Hair Force")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item.charAt(0).toUpperCase())
    .join("");
}

function joinClasses(...values) {
  return values.filter(Boolean).join(" ");
}

function cardClassName(className) {
  return joinClasses(className);
}

function buttonClassName(variant, className) {
  const base =
    variant === "link"
      ? "client-admin-link-button"
      : variant === "outline"
        ? "client-admin-button client-admin-button-secondary"
        : variant === "ghost"
          ? "client-admin-button client-admin-button-ghost"
          : "client-admin-button client-admin-button-primary";

  return joinClasses(base, className);
}

function Card({ className = "", ...props }) {
  return <div className={cardClassName(className)} {...props} />;
}

function Badge({ className = "", children, variant: _variant, ...props }) {
  return (
    <span className={joinClasses(className)} {...props}>
      {children}
    </span>
  );
}

function Button({
  children,
  className = "",
  type = "button",
  variant,
  ...props
}) {
  const resolvedClassName = buttonClassName(variant, className);

  return (
    <button type={type} className={resolvedClassName} {...props}>
      {children}
    </button>
  );
}

function Input({ className = "", ...props }) {
  return <input className={joinClasses("form-control", className)} {...props} />;
}

function Label({ className = "", ...props }) {
  return <label className={joinClasses(className)} {...props} />;
}

function Progress({ value = 0, className = "", indicatorClassName = "", ...props }) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));

  return (
    <div className={joinClasses("client-admin-progress-track", className)} {...props}>
      <span
        className={joinClasses("client-admin-progress-bar", indicatorClassName)}
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}

export default function ClientDashboard({ user, initialData }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mainSectionRef = useRef(null);
  const avatarFileInputRef = useRef(null);
  const avatarDragStateRef = useRef({
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0
  });
  const [dashboard, setDashboard] = useState(initialData);
  const [activeTab, setActiveTab] = useState(getValidTab(searchParams.get("tab")));
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [avatarFileName, setAvatarFileName] = useState("");
  const [avatarEditor, setAvatarEditor] = useState(() => createAvatarEditorState());
  const [profileForm, setProfileForm] = useState(() =>
    createProfileForm(initialData?.profile, user)
  );
  const [preferenceForm, setPreferenceForm] = useState(() =>
    createPreferenceForm(initialData?.notificationPreferences)
  );
  const [paymentMethodForm, setPaymentMethodForm] = useState(() =>
    createPaymentMethodForm()
  );
  const [paymentSection, setPaymentSection] = useState("overview");
  const [bookingSection, setBookingSection] = useState("upcoming");
  const [accountSection, setAccountSection] = useState("details");
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    password: "",
    confirmPassword: ""
  });
  const [receiptState, setReceiptState] = useState({
    id: "",
    loading: false,
    error: "",
    data: null
  });
  const [activeConversationId, setActiveConversationId] = useState(
    initialData?.conversations?.[0]?.id || ""
  );
  const [messageThread, setMessageThread] = useState(() => createMessageThreadState());
  const [conversationSearch, setConversationSearch] = useState("");
  const [widgetOpen, setWidgetOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState("");
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showConversations, setShowConversations] = useState(false);
  const [expandedBookingId, setExpandedBookingId] = useState("");
  const [rescheduleState, setRescheduleState] = useState({
    bookingId: "",
    windows: [],
    selectedDate: "",
    selectedSlot: "",
    loading: false,
    error: ""
  });
  const [loading, setLoading] = useState({
    refresh: false,
    favorite: "",
    booking: "",
    paymentMethod: "",
    paymentBooking: "",
    receipt: "",
    profile: false,
    addPaymentMethod: false,
    password: false,
    preferences: false,
    signout: false,
    deleteAccount: false
  });

  useEffect(() => {
    setActiveTab(getValidTab(searchParams.get("tab")));
  }, [searchParams]);

  useEffect(() => {
    setDashboard(initialData);
  }, [initialData]);

  useEffect(() => {
    setProfileForm(createProfileForm(dashboard?.profile, user));
    setPreferenceForm(createPreferenceForm(dashboard?.notificationPreferences));
    setAvatarFileName("");
    setAvatarEditor(createAvatarEditorState());
  }, [dashboard, user]);

  useEffect(() => {
    const nextConversations = dashboard?.conversations || [];

    if (!nextConversations.length) {
      if (activeConversationId) {
        setActiveConversationId("");
      }
      return;
    }

    if (!nextConversations.some((conversation) => conversation.id === activeConversationId)) {
      setActiveConversationId(nextConversations[0].id);
    }
  }, [activeConversationId, dashboard?.conversations]);

  useEffect(() => {
    if (activeTab !== "payments") {
      return;
    }

    setPaymentSection((current) =>
      PAYMENT_SECTION_OPTIONS.some((item) => item.id === current) ? current : "overview"
    );
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "bookings") {
      return;
    }

    setBookingSection((current) =>
      BOOKING_SECTION_OPTIONS.some((item) => item.id === current) ? current : "upcoming"
    );
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "profile") {
      return;
    }

    setAccountSection((current) =>
      ACCOUNT_SECTION_OPTIONS.some((item) => item.id === current) ? current : "details"
    );
  }, [activeTab]);

  useEffect(() => {
    if (!avatarEditor.open) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [avatarEditor.open]);

  useEffect(() => {
    if (activeTab !== "messages" || !activeConversationId) {
      return;
    }

    loadConversation(activeConversationId);
  }, [activeConversationId, activeTab]);

  useEffect(() => {
    if (!showNotifications && !showUserMenu && !showConversations) return;

    function handleClickOutside(event) {
      const notificationContainer = document.querySelector(".client-notification-bell-container");
      if (notificationContainer && !notificationContainer.contains(event.target)) {
        setShowNotifications(false);
      }
      const userContainer = document.querySelector(".client-user-avatar-container");
      if (userContainer && !userContainer.contains(event.target)) {
        setShowUserMenu(false);
      }
      const conversationContainer = document.querySelector(".client-message-bell-container");
      if (conversationContainer && !conversationContainer.contains(event.target)) {
        setShowConversations(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNotifications, showUserMenu, showConversations]);

  const activeCopy = HEADER_COPY[activeTab] || HEADER_COPY.overview;
  const displayName = dashboard?.profile?.name || user.name || "Client";
  const conversations = dashboard?.conversations || [];
  const activeConversation =
    conversations.find((conversation) => conversation.id === activeConversationId) || null;
  const nextBooking = dashboard?.overview?.nextBooking;
  const unreadNotifications = dashboard?.overview?.unreadNotifications || 0;
  const unreadMessages = conversations.reduce(
    (sum, conversation) => sum + Number(conversation.clientUnreadCount || 0),
    0
  );
  const paymentsSummary = dashboard?.payments?.summary || {};
  const defaultPaymentMethod = paymentsSummary.defaultMethod || null;
  const outstandingBookings = dashboard?.payments?.outstandingBookings || [];
  const paymentHistory = dashboard?.payments?.history || [];
  const savedMethods = dashboard?.payments?.savedMethods || [];
  const canChangePassword = Boolean(dashboard?.profile?.canChangePassword);
  const linkedMethodCount =
    dashboard?.profile?.linkedMethods?.filter((item) => item.connected).length || 0;
  const totalLinkedMethods = dashboard?.profile?.linkedMethods?.length || 3;
  const avatarPreviewMetrics = avatarEditor.open
    ? getAvatarEditorMetrics(
        avatarEditor.imageWidth,
        avatarEditor.imageHeight,
        AVATAR_EDITOR_FRAME_SIZE,
        avatarEditor.scale
      )
    : { renderedWidth: AVATAR_EDITOR_FRAME_SIZE, renderedHeight: AVATAR_EDITOR_FRAME_SIZE };

  const sidebarItems = useMemo(
    () =>
      TAB_OPTIONS.map((item) => ({
        ...item,
        count:
          item.id === "bookings"
            ? dashboard?.upcomingBookings?.length || 0
            : item.id === "payments"
              ? paymentsSummary.unpaidBookingsCount || 0
            : item.id === "favorites"
              ? dashboard?.favorites?.length || 0
            : item.id === "messages"
              ? unreadMessages
              : 0
      })),
    [dashboard, paymentsSummary.unpaidBookingsCount, unreadMessages]
  );

  const metrics = useMemo(
    () => [
      {
        id: "appointments",
        label: "Upcoming Bookings",
        value: String(dashboard?.upcomingBookings?.length || 0),
        detail: nextBooking
          ? `Next: ${formatAppointmentDate(nextBooking.appointmentDate)}`
          : "No upcoming appointment"
      },
      {
        id: "payments",
        label: "Pending Payments",
        value: String(dashboard?.overview?.pendingPayments || 0),
        detail:
          dashboard?.overview?.pendingPayments
            ? `${dashboard.overview.pendingPayments} booking item(s) need attention`
            : "Payments are up to date"
      },
      {
        id: "favorites",
        label: "Saved Stylists",
        value: String(dashboard?.favorites?.length || 0),
        detail:
          dashboard?.favorites?.length
            ? "Your go-to stylists are ready to rebook"
            : "Save stylists to speed up rebooking"
      },
    ],
    [dashboard, nextBooking]
  );

  const quickStats = useMemo(() => {
    const accountProgress = Math.round((linkedMethodCount / Math.max(1, totalLinkedMethods)) * 100);
    const favoriteProgress = Math.min(100, (dashboard?.favorites?.length || 0) * 25);

    return [
      {
        id: "account",
        label: "Account setup",
        value: `${accountProgress}%`,
        progress: accountProgress
      },
      {
        id: "favorites",
        label: "Rebook readiness",
        value: `${favoriteProgress}%`,
        progress: favoriteProgress
      }
    ];
  }, [dashboard, linkedMethodCount, totalLinkedMethods]);

  function syncTabUrl(nextTab) {
    if (typeof window === "undefined") {
      return;
    }

    const validTab = getValidTab(nextTab);
    const nextUrl = new URL(window.location.href);

    if (validTab === "overview") {
      nextUrl.searchParams.delete("tab");
    } else {
      nextUrl.searchParams.set("tab", validTab);
    }

    nextUrl.hash = "client-dashboard-main";
    window.history.replaceState({}, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
  }

  function handleTabChange(nextTab) {
    const validTab = getValidTab(nextTab);
    const shouldScrollToMain = typeof window !== "undefined" && window.innerWidth <= 1180;

    setActiveTab(validTab);
    syncTabUrl(validTab);

    if (shouldScrollToMain) {
      window.setTimeout(() => {
        mainSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }, 80);
    }
  }

  async function fetchJson(url, options) {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers || {})
      },
      ...options
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Request failed.");
    }

    return data;
  }

  async function refreshDashboard() {
    setLoading((current) => ({ ...current, refresh: true }));

    try {
      const data = await fetchJson("/api/dashboard/profile", { method: "GET" });
      setDashboard(data);
      return data;
    } finally {
      setLoading((current) => ({ ...current, refresh: false }));
    }
  }

  async function refreshConversations() {
    const data = await fetchJson("/api/dashboard/messages", { method: "GET" });
    setDashboard((current) => ({ ...current, conversations: data.conversations || [] }));
    return data.conversations || [];
  }

  async function handleSignOut() {
    setLoading((current) => ({ ...current, signout: true }));

    try {
      await fetch("/api/auth/signout", { method: "POST" });
      router.push("/");
      router.refresh();
    } finally {
      setLoading((current) => ({ ...current, signout: false }));
    }
  }

  async function handleDeleteAccount() {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        "Delete your client account permanently? This removes your client profile and frees this Google login for a stylist account."
      );

      if (!confirmed) {
        return;
      }
    }

    setLoading((current) => ({ ...current, deleteAccount: true }));
    setFeedback({ type: "", message: "" });

    try {
      await fetchJson("/api/dashboard/account", { method: "DELETE" });
      router.push("/");
      router.refresh();
    } catch (error) {
      setFeedback({ type: "error", message: error.message });
    } finally {
      setLoading((current) => ({ ...current, deleteAccount: false }));
    }
  }

  async function handleSaveFavorite(vendorSlug) {
    setLoading((current) => ({ ...current, favorite: vendorSlug }));
    setFeedback({ type: "", message: "" });

    try {
      await fetchJson("/api/dashboard/favorites", {
        method: "POST",
        body: JSON.stringify({ vendorSlug })
      });
      await refreshDashboard();
      setFeedback({ type: "success", message: "Stylist added to your saved list." });
    } catch (error) {
      setFeedback({ type: "error", message: error.message });
    } finally {
      setLoading((current) => ({ ...current, favorite: "" }));
    }
  }

  async function handleRemoveFavorite(vendorSlug) {
    setLoading((current) => ({ ...current, favorite: vendorSlug }));
    setFeedback({ type: "", message: "" });

    try {
      await fetchJson(`/api/dashboard/favorites/${vendorSlug}`, {
        method: "DELETE"
      });
      await refreshDashboard();
      setFeedback({ type: "success", message: "Stylist removed from your saved list." });
    } catch (error) {
      setFeedback({ type: "error", message: error.message });
    } finally {
      setLoading((current) => ({ ...current, favorite: "" }));
    }
  }

  async function handleProfileSubmit(event) {
    event.preventDefault();
    setLoading((current) => ({ ...current, profile: true }));
    setFeedback({ type: "", message: "" });

    try {
      await fetchJson("/api/dashboard/profile", {
        method: "PUT",
        body: JSON.stringify(profileForm)
      });
      await refreshDashboard();
      setFeedback({ type: "success", message: "Profile updated successfully." });
    } catch (error) {
      setFeedback({ type: "error", message: error.message });
    } finally {
      setLoading((current) => ({ ...current, profile: false }));
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    setLoading((current) => ({ ...current, password: true }));
    setFeedback({ type: "", message: "" });

    try {
      await fetchJson("/api/dashboard/security/password", {
        method: "POST",
        body: JSON.stringify(passwordForm)
      });
      setPasswordForm({
        currentPassword: "",
        password: "",
        confirmPassword: ""
      });
      setFeedback({ type: "success", message: "Password updated successfully." });
    } catch (error) {
      setFeedback({ type: "error", message: error.message });
    } finally {
      setLoading((current) => ({ ...current, password: false }));
    }
  }

  async function handlePreferenceSubmit(event) {
    event.preventDefault();
    setLoading((current) => ({ ...current, preferences: true }));
    setFeedback({ type: "", message: "" });

    try {
      await fetchJson("/api/dashboard/notifications/preferences", {
        method: "PUT",
        body: JSON.stringify(preferenceForm)
      });
      await refreshDashboard();
      setFeedback({ type: "success", message: "Notification preferences saved." });
    } catch (error) {
      setFeedback({ type: "error", message: error.message });
    } finally {
      setLoading((current) => ({ ...current, preferences: false }));
    }
  }

  async function handleAvatarFileChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setFeedback({ type: "error", message: "Choose a JPG, PNG, or WebP image file." });
      event.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setFeedback({ type: "error", message: "Profile photos must be 2 MB or smaller." });
      event.target.value = "";
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      const dimensions = await loadImageDimensions(dataUrl);
      setAvatarEditor(
        normalizeAvatarEditorState({
          ...createAvatarEditorState(),
          open: true,
          source: dataUrl,
          fileName: file.name,
          imageWidth: dimensions.width,
          imageHeight: dimensions.height
        })
      );
      setFeedback({ type: "", message: "" });
    } catch (error) {
      setFeedback({ type: "error", message: error.message });
    }

    event.target.value = "";
  }

  function handleRemoveAvatar() {
    setProfileForm((current) => ({ ...current, avatar: "" }));
    setAvatarFileName("");

    if (avatarFileInputRef.current) {
      avatarFileInputRef.current.value = "";
    }
  }

  function handleCloseAvatarEditor() {
    setAvatarEditor(createAvatarEditorState());
    avatarDragStateRef.current = {
      active: false,
      pointerId: null,
      startX: 0,
      startY: 0,
      offsetX: 0,
      offsetY: 0
    };
  }

  function handleAvatarEditorPointerDown(event) {
    if (!avatarEditor.open) {
      return;
    }

    avatarDragStateRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: avatarEditor.offsetX,
      offsetY: avatarEditor.offsetY
    };

    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handleAvatarEditorPointerMove(event) {
    if (!avatarDragStateRef.current.active) {
      return;
    }

    const deltaX = event.clientX - avatarDragStateRef.current.startX;
    const deltaY = event.clientY - avatarDragStateRef.current.startY;

    setAvatarEditor((current) =>
      normalizeAvatarEditorState({
        ...current,
        offsetX: avatarDragStateRef.current.offsetX + deltaX,
        offsetY: avatarDragStateRef.current.offsetY + deltaY
      })
    );
  }

  function handleAvatarEditorPointerEnd(event) {
    if (!avatarDragStateRef.current.active) {
      return;
    }

    avatarDragStateRef.current.active = false;
    avatarDragStateRef.current.pointerId = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  }

  function handleAvatarEditorScaleChange(event) {
    const nextScale = Number(event.target.value || 1);

    setAvatarEditor((current) =>
      normalizeAvatarEditorState({
        ...current,
        scale: nextScale
      })
    );
  }

  function handleAvatarEditorAdjustChange(key, value) {
    setAvatarEditor((current) => ({
      ...current,
      [key]: Number(value)
    }));
  }

  function handleAvatarEditorReset() {
    setAvatarEditor((current) =>
      normalizeAvatarEditorState({
        ...current,
        offsetX: 0,
        offsetY: 0,
        scale: 1,
        brightness: 100,
        contrast: 100,
        error: ""
      })
    );
  }

  async function handleApplyAvatarEditor() {
    setAvatarEditor((current) => ({
      ...current,
      processing: true,
      error: ""
    }));

    try {
      const nextAvatar = await renderAvatarEditorImage(avatarEditor);
      setProfileForm((current) => ({ ...current, avatar: nextAvatar }));
      setAvatarFileName(avatarEditor.fileName);
      setFeedback({ type: "", message: "" });
      handleCloseAvatarEditor();
    } catch (error) {
      setAvatarEditor((current) => ({
        ...current,
        processing: false,
        error: error.message
      }));
    }
  }

  async function handleAddPaymentMethod(event) {
    event.preventDefault();
    setLoading((current) => ({ ...current, addPaymentMethod: true }));
    setFeedback({ type: "", message: "" });

    try {
      await fetchJson("/api/dashboard/payments", {
        method: "POST",
        body: JSON.stringify({
          ...paymentMethodForm,
          expMonth: Number(paymentMethodForm.expMonth || 0),
          expYear: Number(paymentMethodForm.expYear || 0)
        })
      });
      await refreshDashboard();
      setPaymentMethodForm(createPaymentMethodForm());
      setFeedback({ type: "success", message: "Payment method saved successfully." });
    } catch (error) {
      setFeedback({ type: "error", message: error.message });
    } finally {
      setLoading((current) => ({ ...current, addPaymentMethod: false }));
    }
  }

  async function handleSetDefaultPaymentMethod(methodId) {
    setLoading((current) => ({ ...current, paymentMethod: methodId }));
    setFeedback({ type: "", message: "" });

    try {
      await fetchJson(`/api/dashboard/payments/methods/${methodId}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "setDefault" })
      });
      await refreshDashboard();
      setFeedback({ type: "success", message: "Default payment method updated." });
    } catch (error) {
      setFeedback({ type: "error", message: error.message });
    } finally {
      setLoading((current) => ({ ...current, paymentMethod: "" }));
    }
  }

  async function handleRemovePaymentMethod(methodId) {
    setLoading((current) => ({ ...current, paymentMethod: methodId }));
    setFeedback({ type: "", message: "" });

    try {
      await fetchJson(`/api/dashboard/payments/methods/${methodId}`, {
        method: "DELETE"
      });
      await refreshDashboard();
      setFeedback({ type: "success", message: "Payment method removed." });
    } catch (error) {
      setFeedback({ type: "error", message: error.message });
    } finally {
      setLoading((current) => ({ ...current, paymentMethod: "" }));
    }
  }

  async function handlePayBooking(bookingId, action = "pay") {
    const methodId = defaultPaymentMethod?.id || savedMethods[0]?.id || "";

    if (!methodId) {
      setFeedback({ type: "error", message: "Add a payment method first to clear this booking." });
      return;
    }

    setLoading((current) => ({ ...current, paymentBooking: bookingId }));
    setFeedback({ type: "", message: "" });

    try {
      await fetchJson(`/api/dashboard/payments/bookings/${bookingId}`, {
        method: "POST",
        body: JSON.stringify({
          action,
          paymentMethodId: methodId
        })
      });
      await refreshDashboard();
      setFeedback({
        type: "success",
        message: action === "retry" ? "Payment retried successfully." : "Payment completed successfully."
      });
    } catch (error) {
      setFeedback({ type: "error", message: error.message });
    } finally {
      setLoading((current) => ({ ...current, paymentBooking: "" }));
    }
  }

  async function handleViewReceipt(receiptId) {
    setLoading((current) => ({ ...current, receipt: receiptId }));
    setReceiptState({ id: receiptId, loading: true, error: "", data: null });

    try {
      const data = await fetchJson(`/api/dashboard/payments/receipts/${receiptId}`, {
        method: "GET"
      });
      setReceiptState({ id: receiptId, loading: false, error: "", data: data.record });
    } catch (error) {
      setReceiptState({ id: receiptId, loading: false, error: error.message, data: null });
    } finally {
      setLoading((current) => ({ ...current, receipt: "" }));
    }
  }

  async function handleCancelBooking(bookingId) {
    const shouldContinue = window.confirm(
      "Cancel this appointment? You can still book another slot later."
    );

    if (!shouldContinue) {
      return;
    }

    setLoading((current) => ({ ...current, booking: bookingId }));
    setFeedback({ type: "", message: "" });

    try {
      await fetchJson(`/api/dashboard/client-bookings/${bookingId}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "cancel" })
      });
      await refreshDashboard();
      setRescheduleState({
        bookingId: "",
        windows: [],
        selectedDate: "",
        selectedSlot: "",
        loading: false,
        error: ""
      });
      setFeedback({ type: "success", message: "Booking cancelled." });
    } catch (error) {
      setFeedback({ type: "error", message: error.message });
    } finally {
      setLoading((current) => ({ ...current, booking: "" }));
    }
  }

  async function handleOpenReschedule(bookingId) {
    setRescheduleState({
      bookingId,
      windows: [],
      selectedDate: "",
      selectedSlot: "",
      loading: true,
      error: ""
    });
    setFeedback({ type: "", message: "" });

    try {
      const data = await fetchJson(`/api/dashboard/client-bookings/${bookingId}/availability`, {
        method: "GET"
      });
      const firstWindow = data.windows[0];
      setRescheduleState({
        bookingId,
        windows: data.windows,
        selectedDate: firstWindow?.date || "",
        selectedSlot: firstWindow?.slots?.[0] || "",
        loading: false,
        error: data.windows.length ? "" : "No new slots are available right now."
      });
    } catch (error) {
      setRescheduleState({
        bookingId,
        windows: [],
        selectedDate: "",
        selectedSlot: "",
        loading: false,
        error: error.message
      });
    }
  }

  async function handleConfirmReschedule() {
    if (!rescheduleState.bookingId || !rescheduleState.selectedDate || !rescheduleState.selectedSlot) {
      return;
    }

    setLoading((current) => ({ ...current, booking: rescheduleState.bookingId }));
    setFeedback({ type: "", message: "" });

    try {
      await fetchJson(`/api/dashboard/client-bookings/${rescheduleState.bookingId}`, {
        method: "PATCH",
        body: JSON.stringify({
          action: "reschedule",
          appointmentDate: rescheduleState.selectedDate,
          appointmentSlot: rescheduleState.selectedSlot
        })
      });
      await refreshDashboard();
      setRescheduleState({
        bookingId: "",
        windows: [],
        selectedDate: "",
        selectedSlot: "",
        loading: false,
        error: ""
      });
      setFeedback({ type: "success", message: "Booking rescheduled successfully." });
    } catch (error) {
      setFeedback({ type: "error", message: error.message });
    } finally {
      setLoading((current) => ({ ...current, booking: "" }));
    }
  }

  async function loadConversation(conversationId) {
    if (!conversationId) {
      return;
    }

    setMessageThread((current) => ({ ...current, loading: true, error: "" }));

    try {
      const data = await fetchJson(`/api/dashboard/messages/${conversationId}`, { method: "GET" });
      setMessageThread((current) => ({
        ...current,
        loading: false,
        messages: data.messages || [],
        error: ""
      }));
      await refreshConversations();
    } catch (error) {
      setMessageThread((current) => ({ ...current, loading: false, error: error.message }));
    }
  }

  async function handleOpenConversationForBooking(bookingId) {
    handleTabChange("messages");

    try {
      const data = await fetchJson("/api/dashboard/messages", {
        method: "POST",
        body: JSON.stringify({ bookingId })
      });

      setActiveConversationId(data.conversation?.id || "");
      setMessageThread((current) => ({
        ...current,
        loading: false,
        error: "",
        messages: data.messages || []
      }));
      await refreshConversations();
    } catch (error) {
      setFeedback({ type: "error", message: error.message });
    }
  }

  async function handleSendMessage(eventOrBody) {
    if (eventOrBody?.preventDefault) {
      eventOrBody.preventDefault();
    }

    const bodyText = typeof eventOrBody === "string" ? eventOrBody : messageThread.draft;

    if (!activeConversationId || !bodyText.trim()) {
      return;
    }

    setMessageThread((current) => ({ ...current, sending: true, error: "" }));

    try {
      const data = await fetchJson(`/api/dashboard/messages/${activeConversationId}`, {
        method: "POST",
        body: JSON.stringify({ body: bodyText.trim() })
      });

      setMessageThread((current) => ({
        ...current,
        sending: false,
        draft: "",
        messages: data.messages || [],
        error: ""
      }));
      await refreshConversations();
      setFeedback({ type: "success", message: "Message sent." });
    } catch (error) {
      setMessageThread((current) => ({ ...current, sending: false, error: error.message }));
    }
  }

  return (
    <div className="client-admin-shell">
      <aside className="client-admin-sidebar" aria-label="Client dashboard navigation">
        <div className="client-admin-brand-mark">
          <Sparkles size={18} />
        </div>

        <nav className="client-admin-nav" aria-label="Dashboard navigation">
          {sidebarItems.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                className={`client-admin-nav-item ${activeTab === item.id ? "active" : ""}`}
                onClick={() => handleTabChange(item.id)}
                aria-label={item.label}
                title={item.label}
              >
                <Icon size={18} />
                {item.count ? <span className="client-admin-nav-badge">{item.count}</span> : null}
              </button>
            );
          })}
        </nav>

        <div className="client-admin-sidebar-footer">
          <button
            type="button"
            className="client-admin-nav-item"
            onClick={handleSignOut}
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <section id="client-dashboard-main" ref={mainSectionRef} className="client-admin-main">
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, padding: "14px 18px 0" }}>
          {/* Notification Bell */}
          <div className="client-notification-bell-container" style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => {
                setShowNotifications((c) => !c);
                setShowUserMenu(false);
              }}
              style={{
                position: "relative",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 8,
                borderRadius: "50%",
                color: "#64748b",
                width: 40,
                height: 40,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.2s"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#f1f5f9"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              title="Notifications"
            >
              <Bell size={20} />
              {unreadNotifications > 0 ? (
                <span
                  style={{
                    position: "absolute",
                    top: 2,
                    right: 2,
                    minWidth: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: "#ef4444",
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 4px"
                  }}
                >
                  {unreadNotifications}
                </span>
              ) : null}
            </button>

            {showNotifications ? (
              <div
                style={{
                  position: "absolute",
                  top: 48,
                  right: 0,
                  width: 340,
                  maxHeight: 420,
                  overflow: "auto",
                  background: "#fff",
                  borderRadius: 12,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                  border: "1px solid #e5e5e5",
                  zIndex: 100
                }}
              >
                <div style={{ padding: "12px 16px", borderBottom: "1px solid #e5e5e5" }}>
                  <strong style={{ fontSize: 14, color: "#0f172a" }}>Notifications</strong>
                </div>
                {(dashboard?.notifications || []).length === 0 ? (
                  <div style={{ padding: 20, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                    No notifications yet.
                  </div>
                ) : (
                  (dashboard?.notifications || []).slice(0, 5).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setShowNotifications(false);
                      }}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "12px 16px",
                        border: "none",
                        borderBottom: "1px solid #f1f5f9",
                        background: item.readAt ? "#fff" : "#f0f7ff",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        gap: 4
                      }}
                    >
                      <strong style={{ fontSize: 13, color: "#0f172a" }}>{item.title}</strong>
                      <span style={{ fontSize: 12, color: "#64748b", lineHeight: 1.4 }}>{item.message}</span>
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>

          {/* Message Icon */}
          <div className="client-message-bell-container" style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => {
                setShowConversations((c) => !c);
                setShowNotifications(false);
                setShowUserMenu(false);
              }}
              style={{
                position: "relative",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 8,
                borderRadius: "50%",
                color: "#64748b",
                width: 40,
                height: 40,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.2s"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#f1f5f9"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              title="Messages"
            >
              <MessageSquareText size={20} />
              {unreadMessages > 0 ? (
                <span
                  style={{
                    position: "absolute",
                    top: 2,
                    right: 2,
                    minWidth: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: "#ef4444",
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 4px"
                  }}
                >
                  {unreadMessages}
                </span>
              ) : null}
            </button>

            {showConversations ? (
              <div
                style={{
                  position: "absolute",
                  top: 48,
                  right: 0,
                  width: 340,
                  maxHeight: 420,
                  overflow: "auto",
                  background: "#fff",
                  borderRadius: 12,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                  border: "1px solid #e5e5e5",
                  zIndex: 100
                }}
              >
                <div style={{ padding: "12px 16px", borderBottom: "1px solid #e5e5e5" }}>
                  <strong style={{ fontSize: 14, color: "#0f172a" }}>Messages</strong>
                </div>
                {conversations.length === 0 ? (
                  <div style={{ padding: 20, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                    No conversations yet.
                  </div>
                ) : (
                  conversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => {
                        setActiveConversationId(conversation.id);
                        setShowConversations(false);
                        setWidgetOpen(true);
                      }}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "12px 16px",
                        border: "none",
                        borderBottom: "1px solid #f1f5f9",
                        background: conversation.clientUnreadCount > 0 ? "#f0f7ff" : "#fff",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        gap: 4
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <strong style={{ fontSize: 13, color: "#0f172a" }}>{conversation.vendorName || "Stylist"}</strong>
                        {conversation.clientUnreadCount > 0 ? (
                          <span
                            style={{
                              minWidth: 18,
                              height: 18,
                              borderRadius: "50%",
                              background: "#0070f3",
                              color: "#fff",
                              fontSize: 10,
                              fontWeight: 600,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: "0 5px"
                            }}
                          >
                            {conversation.clientUnreadCount}
                          </span>
                        ) : null}
                      </div>
                      <span style={{ fontSize: 12, color: "#64748b", lineHeight: 1.4 }}>
                        {conversation.lastMessagePreview || "No messages yet"}
                      </span>
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>

          {/* User Avatar */}
          <div className="client-user-avatar-container" style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => {
                setShowUserMenu((c) => !c);
                setShowNotifications(false);
              }}
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                border: "none",
                overflow: "hidden",
                cursor: "pointer",
                padding: 0,
                background: "#e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
              title="Account"
            >
              {profileForm.avatar ? (
                <img src={profileForm.avatar} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#64748b",
                    background: "linear-gradient(135deg, #2856f8, #54b6ff)",
                    color: "#fff"
                  }}
                >
                  {getInitials(profileForm.name || displayName)}
                </div>
              )}
            </button>

            {showUserMenu ? (
              <div
                style={{
                  position: "absolute",
                  top: 48,
                  right: 0,
                  width: 220,
                  background: "#fff",
                  borderRadius: 12,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                  border: "1px solid #e5e5e5",
                  zIndex: 100,
                  overflow: "hidden"
                }}
              >
                <button
                  type="button"
                  onClick={() => { setShowUserMenu(false); handleTabChange("profile"); }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "12px 16px",
                    border: "none",
                    borderBottom: "1px solid #f1f5f9",
                    background: "#fff",
                    cursor: "pointer",
                    fontSize: 13,
                    color: "#0f172a"
                  }}
                >
                  Profile
                </button>
                <button
                  type="button"
                  onClick={() => { setShowUserMenu(false); handleSignOut(); }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "12px 16px",
                    border: "none",
                    background: "#fff",
                    cursor: "pointer",
                    fontSize: 13,
                    color: "#dc2626"
                  }}
                >
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <header className="client-admin-header">
          <div>
            <h1>{activeCopy.title}</h1>
            <p>{activeCopy.subtitle}</p>
          </div>
        </header>

        {feedback.message ? (
          <div className={`client-admin-feedback ${feedback.type}`}>
            {feedback.message}
          </div>
        ) : null}

        {activeTab === "overview" ? (
          <div className="client-admin-content-stack">
            <div className="client-admin-overview-grid">
              <Card className="client-admin-panel client-admin-panel-large">
                <div className="client-admin-panel-head">
                  <div>
                    <h2>Recent Activity</h2>
                    <p>Fresh updates from your bookings and account</p>
                  </div>
                  <Button
                    type="button"
                    variant="link"
                    className="client-admin-link-button"
                    onClick={() => setShowNotifications((c) => !c)}
                  >
                    View all
                  </Button>
                </div>

                <div className="client-admin-activity-list">
                  {dashboard?.overview?.recentActivity?.length ? (
                    dashboard.overview.recentActivity.map((item) => (
                      <div key={item.id} className="client-admin-activity-item">
                        <span className="client-admin-activity-icon">
                          {item.type?.includes("payment") ? <Wallet size={18} /> : null}
                          {item.type?.includes("booking") ? <CalendarDays size={18} /> : null}
                          {!item.type?.includes("payment") && !item.type?.includes("booking") ? (
                            <Bell size={18} />
                          ) : null}
                        </span>
                        <div className="client-admin-activity-copy">
                          <strong>{item.title}</strong>
                          <p>{item.message}</p>
                        </div>
                        <span className="client-admin-time">{formatNotificationDate(item.createdAt)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="client-admin-empty">
                      <strong>No recent activity yet</strong>
                      <p>Booking confirmations and reminders will show up here as soon as you start using the dashboard.</p>
                    </div>
                  )}
                </div>
              </Card>
              <Card className="client-admin-panel">
                <div className="client-admin-panel-head">
                  <div>
                    <h2>Next Appointment</h2>
                    <p>Your nearest booking and fastest actions</p>
                  </div>
                </div>

                {nextBooking ? (
                  <div className="client-admin-highlight">
                    <Badge variant="secondary" className={`client-admin-status ${bookingTone(nextBooking)}`}>
                      {bookingStatusLabel(nextBooking)}
                    </Badge>
                    <strong>{nextBooking.serviceName}</strong>
                    <p>
                      {nextBooking.vendorName} on {formatAppointmentDate(nextBooking.appointmentDate)} at{" "}
                      {nextBooking.appointmentSlot}
                    </p>
                    <div className="client-admin-chip-row">
                      <Badge variant="secondary" className="client-admin-chip">
                        Total {formatCurrency(nextBooking.total || 0)}
                      </Badge>
                      <Badge variant="secondary" className="client-admin-chip">
                        Remaining {formatCurrency(nextBooking.remainingAmount || 0)}
                      </Badge>
                    </div>
                    <div className="client-admin-action-row">
                      <Link
                        href={`/book/${nextBooking.vendorSlug}`}
                        className="client-admin-button client-admin-button-primary"
                      >
                        Book again
                      </Link>
                      <Button
                        type="button"
                        variant="outline"
                        className="client-admin-button client-admin-button-secondary"
                        onClick={() => handleTabChange("bookings")}
                      >
                        Manage booking
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="client-admin-empty">
                    <strong>No upcoming booking</strong>
                    <p>When you reserve your next appointment, it will appear here with quick actions.</p>
                    <Link href="/discover" className="client-admin-button client-admin-button-primary">
                      Browse stylists
                    </Link>
                  </div>
                )}
              </Card>
            </div>

            <div className="client-admin-preview-grid">
              <Card className="client-admin-panel">
                <div className="client-admin-panel-head">
                  <div>
                    <h2>Upcoming</h2>
                    <p>Appointments you can still manage</p>
                  </div>
                  <Button
                    type="button"
                    variant="link"
                    className="client-admin-link-button"
                    onClick={() => handleTabChange("bookings")}
                  >
                    Open bookings
                  </Button>
                </div>

                <div className="client-admin-list">
                  {dashboard?.upcomingBookings?.length ? (
                    dashboard.upcomingBookings.slice(0, 3).map((booking) => (
                      <div key={booking.id} className="client-admin-list-item compact">
                        <div>
                          <strong>{booking.serviceName}</strong>
                          <p>
                            {booking.vendorName} - {formatAppointmentDate(booking.appointmentDate)} - {booking.appointmentSlot}
                          </p>
                        </div>
                        <Badge variant="secondary" className={`client-admin-status ${bookingTone(booking)}`}>
                          {bookingStatusLabel(booking)}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="client-admin-empty compact">
                      <p>No upcoming bookings yet.</p>
                    </div>
                  )}
                </div>
              </Card>

              <Card className="client-admin-panel">
                <div className="client-admin-panel-head">
                  <div>
                    <h2>Saved Stylists</h2>
                    <p>Quick access to your preferred providers</p>
                  </div>
                  <Button
                    type="button"
                    variant="link"
                    className="client-admin-link-button"
                    onClick={() => handleTabChange("favorites")}
                  >
                    Open saved list
                  </Button>
                </div>

                <div className="client-admin-list">
                  {dashboard?.favorites?.length ? (
                    dashboard.favorites.slice(0, 3).map((vendor) => (
                      <div key={vendor.slug} className="client-admin-list-item compact">
                        <div>
                          <strong>{vendor.name}</strong>
                          <p>
                            {vendor.category} - {vendor.city}
                          </p>
                        </div>
                        <Link href={`/book/${vendor.slug}`} className="client-admin-inline-link">
                          Book
                          <ChevronRight size={16} />
                        </Link>
                      </div>
                    ))
                  ) : (
                    <div className="client-admin-empty compact">
                      <p>No saved stylists yet.</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        ) : null}

        {activeTab === "bookings" ? (
          <div className="client-admin-content-stack">
            <div className="client-admin-section-tabs" role="tablist" aria-label="Booking sections">
              {BOOKING_SECTION_OPTIONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`client-admin-section-tab ${bookingSection === item.id ? "active" : ""}`}
                  onClick={() => setBookingSection(item.id)}
                  role="tab"
                  aria-selected={bookingSection === item.id}
                >
                  {item.label}
                  <span className="client-admin-section-tab-count">
                    {item.id === "upcoming"
                      ? dashboard?.upcomingBookings?.length || 0
                      : dashboard?.pastBookings?.length || 0}
                  </span>
                </button>
              ))}
            </div>

            {bookingSection === "upcoming" ? (
              <Card className="client-admin-panel">
                <div className="client-admin-panel-head">
                  <div>
                    <h2>Upcoming Appointments</h2>
                    <p>Cancel or reschedule until 24 hours before the appointment</p>
                  </div>
                </div>

                <div className="client-admin-list">
                  {dashboard?.upcomingBookings?.length ? (
                    dashboard.upcomingBookings.map((booking) => (
                      <div key={booking.id} className="client-admin-list-item">
                        <div className="client-admin-list-top">
                          <div>
                            <strong>{booking.serviceName}</strong>
                            <p>{booking.vendorName}</p>
                          </div>
                          <Badge variant="secondary" className={`client-admin-status ${bookingTone(booking)}`}>
                            {bookingStatusLabel(booking)}
                          </Badge>
                        </div>

                        <div className="client-admin-meta">
                          <span><CalendarDays size={15} /> {formatAppointmentDate(booking.appointmentDate)}</span>
                          <span><Clock3 size={15} /> {booking.appointmentSlot}</span>
                          <span><Wallet size={15} /> {formatCurrency(booking.total)}</span>
                        </div>

                        <div className="client-admin-chip-row">
                          <Badge variant="secondary" className="client-admin-chip">
                            Deposit {formatCurrency(booking.depositAmount || 0)}
                          </Badge>
                          <Badge variant="secondary" className="client-admin-chip">
                            Remaining {formatCurrency(booking.remainingAmount || 0)}
                          </Badge>
                          <Badge variant="secondary" className="client-admin-chip">{booking.paymentStatus}</Badge>
                        </div>

                        <div className="client-admin-action-row">
                          <Button
                            type="button"
                            variant="outline"
                            className="client-admin-button client-admin-button-secondary"
                            onClick={() =>
                              setExpandedBookingId((current) => (current === booking.id ? "" : booking.id))
                            }
                          >
                            {expandedBookingId === booking.id ? "Hide details" : "View details"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="client-admin-button client-admin-button-secondary"
                            disabled={!booking.canReschedule || loading.booking === booking.id}
                            onClick={() => handleOpenReschedule(booking.id)}
                          >
                            Reschedule
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="client-admin-button client-admin-button-secondary"
                            onClick={() => handleOpenConversationForBooking(booking.id)}
                          >
                            Message stylist
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            className="client-admin-button client-admin-button-ghost"
                            disabled={!booking.canCancel || loading.booking === booking.id}
                            onClick={() => handleCancelBooking(booking.id)}
                          >
                            Cancel
                          </Button>
                          <Link
                            href={`/book/${booking.vendorSlug}`}
                            className="client-admin-button client-admin-button-primary"
                          >
                            Book again
                          </Link>
                        </div>

                        {expandedBookingId === booking.id ? (
                          <div className="client-admin-detail-box">
                            <p>Notes: {booking.notes || "No notes added."}</p>
                            {booking.previousAppointmentDate ? (
                              <p>
                                Previously scheduled for {formatAppointmentDate(booking.previousAppointmentDate)} at{" "}
                                {booking.previousAppointmentSlot}.
                              </p>
                            ) : null}
                            {!booking.canReschedule || !booking.canCancel ? (
                              <p>Self-serve changes close 24 hours before the appointment.</p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <div className="client-admin-empty">
                      <strong>No upcoming bookings</strong>
                      <p>Reserve your next visit and it will appear here with management actions.</p>
                    </div>
                  )}
                </div>

                {rescheduleState.bookingId ? (
                  <div className="client-admin-reschedule-block">
                    <div className="client-admin-panel-head">
                      <div>
                        <h2>Reschedule Booking</h2>
                        <p>Choose a fresh slot from current availability</p>
                      </div>
                    </div>

                    <div className="client-admin-reschedule">
                      {rescheduleState.loading ? (
                        <p className="client-admin-note">Loading fresh availability...</p>
                      ) : null}

                      {rescheduleState.error ? (
                        <div className="client-admin-feedback error small">
                          {rescheduleState.error}
                        </div>
                      ) : null}

                      {rescheduleState.windows.length ? (
                        <>
                          <div className="client-admin-window-grid">
                            {rescheduleState.windows.map((window) => (
                              <button
                                key={window.date}
                                type="button"
                                className={`client-admin-window ${rescheduleState.selectedDate === window.date ? "active" : ""}`}
                                onClick={() =>
                                  setRescheduleState((current) => ({
                                    ...current,
                                    selectedDate: window.date,
                                    selectedSlot: window.slots[0] || ""
                                  }))
                                }
                              >
                                <strong>{window.label}</strong>
                                <span>{window.slots.length} slot(s)</span>
                              </button>
                            ))}
                          </div>

                          <div className="client-admin-slot-row">
                            {(rescheduleState.windows.find((item) => item.date === rescheduleState.selectedDate)?.slots || []).map(
                              (slot) => (
                                <button
                                  key={slot}
                                  type="button"
                                  className={`client-admin-slot ${rescheduleState.selectedSlot === slot ? "active" : ""}`}
                                  onClick={() =>
                                    setRescheduleState((current) => ({ ...current, selectedSlot: slot }))
                                  }
                                >
                                  {slot}
                                </button>
                              )
                            )}
                          </div>

                          <div className="client-admin-action-row">
                            <Button
                              type="button"
                              className="client-admin-button client-admin-button-primary"
                              onClick={handleConfirmReschedule}
                              disabled={loading.booking === rescheduleState.bookingId}
                            >
                              {loading.booking === rescheduleState.bookingId ? "Saving..." : "Confirm new time"}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              className="client-admin-button client-admin-button-ghost"
                              onClick={() =>
                                setRescheduleState({
                                  bookingId: "",
                                  windows: [],
                                  selectedDate: "",
                                  selectedSlot: "",
                                  loading: false,
                                  error: ""
                                })
                              }
                            >
                              Close
                            </Button>
                          </div>
                        </>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </Card>
            ) : null}

            {bookingSection === "past" ? (
              <Card className="client-admin-panel">
                <div className="client-admin-panel-head">
                  <div>
                    <h2>Past Visits</h2>
                    <p>Rebook quickly from your previous visits</p>
                  </div>
                </div>

                <div className="client-admin-list">
                  {dashboard?.pastBookings?.length ? (
                    dashboard.pastBookings.map((booking) => (
                      <div key={booking.id} className="client-admin-list-item compact">
                        <div>
                          <strong>{booking.serviceName}</strong>
                          <p>
                            {booking.vendorName} - {formatAppointmentDate(booking.appointmentDate)}
                          </p>
                        </div>
                        <Link href={`/book/${booking.vendorSlug}`} className="client-admin-inline-link">
                          Book again
                          <ChevronRight size={16} />
                        </Link>
                      </div>
                    ))
                  ) : (
                    <div className="client-admin-empty compact">
                      <p>Past visits will appear here after your appointments are complete.</p>
                    </div>
                  )}
                </div>
              </Card>
            ) : null}
          </div>
        ) : null}

        {activeTab === "payments" ? (
          <div className="client-admin-content-stack">
            <div className="client-admin-section-tabs client-admin-payments-tabs" role="tablist" aria-label="Payment sections">
              {PAYMENT_SECTION_OPTIONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`client-admin-section-tab ${paymentSection === item.id ? "active" : ""}`}
                  onClick={() => setPaymentSection(item.id)}
                  role="tab"
                  aria-selected={paymentSection === item.id}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <Card className="client-admin-panel client-admin-payments-panel">
                {paymentSection === "overview" ? (
                  <div className="client-admin-content-stack">
                    <div className="client-admin-panel-head">
                      <div>
                        <h2>Overview</h2>
                        <p>Default card, outstanding balances, and your latest payment update</p>
                      </div>
                    </div>

                    <div className="client-admin-highlight">
                      <Badge variant="secondary" className={`client-admin-status ${defaultPaymentMethod ? "success" : "muted"}`}>
                        {defaultPaymentMethod ? "Default method ready" : "No saved method"}
                      </Badge>
                      <strong>{defaultPaymentMethod ? paymentMethodLabel(defaultPaymentMethod) : "Add your first payment method"}</strong>
                      <p>
                        {defaultPaymentMethod
                          ? `Expires ${String(defaultPaymentMethod.expMonth).padStart(2, "0")}/${defaultPaymentMethod.expYear}`
                          : "Save a card to pay deposits and booking balances from one place."}
                      </p>
                    </div>

                    {outstandingBookings.length ? (
                      <div className="client-admin-list">
                        {outstandingBookings.map((booking) => (
                          <div key={booking.id} className="client-admin-list-item">
                            <div className="client-admin-list-top">
                              <div>
                                <strong>{booking.serviceName}</strong>
                                <p>{booking.vendorName}</p>
                              </div>
                              <Badge variant="secondary" className={`client-admin-status ${bookingTone(booking)}`}>
                                {bookingStatusLabel(booking)}
                              </Badge>
                            </div>
                            <div className="client-admin-meta">
                              <span><CalendarDays size={15} /> {formatAppointmentDate(booking.appointmentDate)}</span>
                              <span><Clock3 size={15} /> {booking.appointmentSlot}</span>
                              <span><Wallet size={15} /> Due {formatCurrency(booking.amountDue || 0)}</span>
                            </div>
                            <div className="client-admin-action-row">
                              <Button
                                type="button"
                                className="client-admin-button client-admin-button-primary"
                                disabled={loading.paymentBooking === booking.id || !savedMethods.length}
                                onClick={() =>
                                  handlePayBooking(
                                    booking.id,
                                    booking.paymentStatus === "failed" ? "retry" : "pay"
                                  )
                                }
                              >
                                {loading.paymentBooking === booking.id
                                  ? "Processing..."
                                  : booking.paymentStatus === "failed"
                                    ? "Retry payment"
                                    : "Pay now"}
                              </Button>
                              <Link
                                href="/dashboard?tab=bookings"
                                className="client-admin-button client-admin-button-secondary"
                              >
                                Open booking
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="client-admin-empty">
                        <strong>No outstanding balances</strong>
                        <p>Your current bookings do not need an online payment right now.</p>
                      </div>
                    )}

                    {paymentsSummary.latestPayment ? (
                      <div className="client-admin-detail-box">
                        <strong>Latest payment</strong>
                        <p>
                          {formatCurrency(paymentsSummary.latestPayment.amount || 0)} on{" "}
                          {formatPaymentDate(paymentsSummary.latestPayment.createdAt)}
                        </p>
                        <div className="client-admin-chip-row">
                          <Badge variant="secondary" className={`client-admin-status ${paymentStatusTone(paymentsSummary.latestPayment.status)}`}>
                            {paymentStatusLabel(paymentsSummary.latestPayment.status)}
                          </Badge>
                          {paymentsSummary.latestPayment.bookingServiceName ? (
                            <Badge variant="secondary" className="client-admin-chip">
                              {paymentsSummary.latestPayment.bookingServiceName}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {paymentSection === "methods" ? (
                  <div className="client-admin-content-stack">
                    <div className="client-admin-panel-head">
                      <div>
                        <h2>Saved Methods</h2>
                        <p>Add cards, set a default, and keep checkout ready for the next booking</p>
                      </div>
                      <Badge variant="secondary" className="client-admin-badge subtle">
                        {savedMethods.length}
                      </Badge>
                    </div>

                    <div className="client-admin-methods">
                      {savedMethods.length ? (
                        savedMethods.map((method) => (
                          <div key={method.id} className="client-admin-list-item compact">
                            <div className="client-admin-list-top">
                              <div>
                                <strong>{paymentMethodLabel(method)}</strong>
                                <p>
                                  {method.holderName || "Card holder"} • Expires {String(method.expMonth).padStart(2, "0")}/{method.expYear}
                                </p>
                              </div>
                              <Badge variant="secondary" className={`client-admin-status ${method.isDefault ? "success" : "muted"}`}>
                                {method.isDefault ? "Default" : method.provider}
                              </Badge>
                            </div>
                            <div className="client-admin-action-row">
                              {!method.isDefault ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="client-admin-button client-admin-button-secondary"
                                  disabled={loading.paymentMethod === method.id}
                                  onClick={() => handleSetDefaultPaymentMethod(method.id)}
                                >
                                  {loading.paymentMethod === method.id ? "Saving..." : "Set default"}
                                </Button>
                              ) : null}
                              <Button
                                type="button"
                                variant="ghost"
                                className="client-admin-button client-admin-button-ghost"
                                disabled={loading.paymentMethod === method.id}
                                onClick={() => handleRemovePaymentMethod(method.id)}
                              >
                                {loading.paymentMethod === method.id ? "Removing..." : "Remove"}
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="client-admin-empty compact">
                          <p>No saved cards yet. Add one below to pay booking deposits and balances.</p>
                        </div>
                      )}
                    </div>

                    <form onSubmit={handleAddPaymentMethod} className="client-admin-form-grid">
                      <div className="client-admin-field span-2">
                        <Label htmlFor="payment-holder-name">Cardholder name</Label>
                        <Input
                          id="payment-holder-name"
                          className="form-control"
                          value={paymentMethodForm.holderName}
                          onChange={(event) =>
                            setPaymentMethodForm((current) => ({ ...current, holderName: event.target.value }))
                          }
                          placeholder="Demo Client"
                        />
                      </div>
                      <div className="client-admin-field">
                        <Label htmlFor="payment-brand">Card brand</Label>
                        <select
                          id="payment-brand"
                          className="form-control"
                          value={paymentMethodForm.brand}
                          onChange={(event) =>
                            setPaymentMethodForm((current) => ({ ...current, brand: event.target.value }))
                          }
                        >
                          <option value="Visa">Visa</option>
                          <option value="Mastercard">Mastercard</option>
                          <option value="American Express">American Express</option>
                        </select>
                      </div>
                      <div className="client-admin-field">
                        <Label htmlFor="payment-last4">Last 4 digits</Label>
                        <Input
                          id="payment-last4"
                          className="form-control"
                          value={paymentMethodForm.last4}
                          onChange={(event) =>
                            setPaymentMethodForm((current) => ({
                              ...current,
                              last4: event.target.value.replace(/\D/g, "").slice(0, 4)
                            }))
                          }
                          placeholder="4242"
                          inputMode="numeric"
                        />
                      </div>
                      <div className="client-admin-field">
                        <Label htmlFor="payment-exp-month">Expiry month</Label>
                        <Input
                          id="payment-exp-month"
                          className="form-control"
                          value={paymentMethodForm.expMonth}
                          onChange={(event) =>
                            setPaymentMethodForm((current) => ({
                              ...current,
                              expMonth: event.target.value.replace(/\D/g, "").slice(0, 2)
                            }))
                          }
                          placeholder="12"
                          inputMode="numeric"
                        />
                      </div>
                      <div className="client-admin-field">
                        <Label htmlFor="payment-exp-year">Expiry year</Label>
                        <Input
                          id="payment-exp-year"
                          className="form-control"
                          value={paymentMethodForm.expYear}
                          onChange={(event) =>
                            setPaymentMethodForm((current) => ({
                              ...current,
                              expYear: event.target.value.replace(/\D/g, "").slice(0, 4)
                            }))
                          }
                          placeholder="2028"
                          inputMode="numeric"
                        />
                      </div>
                      <label className="client-admin-toggle span-2">
                        <input
                          type="checkbox"
                          checked={paymentMethodForm.isDefault}
                          onChange={(event) =>
                            setPaymentMethodForm((current) => ({ ...current, isDefault: event.target.checked }))
                          }
                        />
                        <span>
                          <strong>Make this the default card</strong>
                          <small>Future payment actions will use this card first.</small>
                        </span>
                      </label>
                      <Button
                        type="submit"
                        className="client-admin-button client-admin-button-primary span-2"
                        disabled={loading.addPaymentMethod}
                      >
                        {loading.addPaymentMethod ? "Saving..." : "Add card"}
                      </Button>
                    </form>
                  </div>
                ) : null}

                {paymentSection === "history" ? (
                  <div className="client-admin-content-stack">
                    <div className="client-admin-panel-head">
                      <div>
                        <h2>Payment History</h2>
                        <p>Booking-linked charges, statuses, and receipt access</p>
                      </div>
                    </div>

                    <div className="client-admin-list">
                      {paymentHistory.length ? (
                        paymentHistory.map((record) => (
                          <div key={record.id} className="client-admin-list-item">
                            <div className="client-admin-list-top">
                              <div>
                                <strong>{record.description || "Booking payment"}</strong>
                                <p>
                                  {record.bookingVendorName || "Hair Force"} • {formatPaymentDate(record.createdAt)}
                                </p>
                              </div>
                              <Badge variant="secondary" className={`client-admin-status ${paymentStatusTone(record.status)}`}>
                                {paymentStatusLabel(record.status)}
                              </Badge>
                            </div>
                            <div className="client-admin-meta">
                              <span><Wallet size={15} /> {formatCurrency(record.amount || 0)}</span>
                              {record.paymentMethodLast4 ? (
                                <span><ShieldCheck size={15} /> {record.paymentMethodBrand} •••• {record.paymentMethodLast4}</span>
                              ) : null}
                              {record.bookingServiceName ? (
                                <span><CalendarDays size={15} /> {record.bookingServiceName}</span>
                              ) : null}
                            </div>
                            <div className="client-admin-action-row">
                              {record.bookingId ? (
                                <Link href="/dashboard?tab=bookings" className="client-admin-button client-admin-button-secondary">
                                  Open booking
                                </Link>
                              ) : null}
                              {record.status === "succeeded" ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="client-admin-button client-admin-button-secondary"
                                  disabled={loading.receipt === record.id}
                                  onClick={() => handleViewReceipt(record.id)}
                                >
                                  {loading.receipt === record.id ? "Loading..." : "View receipt"}
                                </Button>
                              ) : null}
                              {record.status === "failed" && record.bookingId ? (
                                <Button
                                  type="button"
                                  className="client-admin-button client-admin-button-primary"
                                  disabled={loading.paymentBooking === record.bookingId || !savedMethods.length}
                                  onClick={() => handlePayBooking(record.bookingId, "retry")}
                                >
                                  {loading.paymentBooking === record.bookingId ? "Retrying..." : "Retry payment"}
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="client-admin-empty">
                          <strong>No payment history yet</strong>
                          <p>Your completed booking charges and receipts will appear here.</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                {paymentSection === "receipts" ? (
                  <div className="client-admin-content-stack">
                    <div className="client-admin-panel-head">
                      <div>
                        <h2>Receipts & Policy</h2>
                        <p>Open the latest receipt and review the current payment guidance</p>
                      </div>
                    </div>

                    {receiptState.loading ? (
                      <div className="client-admin-feedback small">Loading receipt details...</div>
                    ) : null}
                    {receiptState.error ? (
                      <div className="client-admin-feedback error small">{receiptState.error}</div>
                    ) : null}
                    {receiptState.data ? (
                      <div className="client-admin-detail-box">
                        <strong>{receiptState.data.description || "Booking receipt"}</strong>
                        <p>
                          {formatCurrency(receiptState.data.amount || 0)} paid on{" "}
                          {formatPaymentDate(receiptState.data.createdAt)}
                        </p>
                        <div className="client-admin-chip-row">
                          <Badge variant="secondary" className="client-admin-chip">
                            {receiptState.data.paymentMethodBrand || "Card"} •••• {receiptState.data.paymentMethodLast4 || "0000"}
                          </Badge>
                          {receiptState.data.bookingServiceName ? (
                            <Badge variant="secondary" className="client-admin-chip">
                              {receiptState.data.bookingServiceName}
                            </Badge>
                          ) : null}
                        </div>
                        {receiptState.data.receiptUrl ? (
                          <a
                            href={receiptState.data.receiptUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="client-admin-inline-link"
                          >
                            Open hosted receipt
                            <ChevronRight size={16} />
                          </a>
                        ) : null}
                      </div>
                    ) : (
                      <div className="client-admin-empty compact">
                        <p>Select any successful payment from Payment History to view its receipt details here.</p>
                      </div>
                    )}

                    <div className="client-admin-list">
                      <div className="client-admin-list-item compact">
                        <div>
                          <strong>Refund and cancellation policy</strong>
                          <p>Deposits already captured follow the stylist’s cancellation policy and may require support review.</p>
                        </div>
                      </div>
                      <div className="client-admin-list-item compact">
                        <div>
                          <strong>Payment support</strong>
                          <p>Use the booking and payment history above to identify the exact charge before contacting support.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
            </Card>
          </div>
        ) : null}

        {activeTab === "favorites" ? (
          <div className="client-admin-content-stack">
            <Card className="client-admin-panel">
              <div className="client-admin-panel-head">
                <div>
                  <h2>Your Saved Stylists</h2>
                  <p>Quick access to the providers you want to revisit</p>
                </div>
                <Badge variant="secondary" className="client-admin-badge subtle">
                  {dashboard?.favorites?.length || 0}
                </Badge>
              </div>

              <div className="client-admin-card-grid">
                {dashboard?.favorites?.length ? (
                  dashboard.favorites.map((vendor) => (
                    <Card key={vendor.slug} className="client-admin-card">
                      <div className="client-admin-card-top">
                        <span className="client-admin-card-icon soft"><Heart size={18} /></span>
                        <Badge variant="secondary" className="client-admin-chip">
                          From {formatCurrency(vendor.priceFrom || 0)}
                        </Badge>
                      </div>
                      <strong>{vendor.name}</strong>
                      <p>{vendor.category} - {vendor.city}</p>
                      <div className="client-admin-meta">
                        <span><MapPin size={15} /> {vendor.location}</span>
                      </div>
                      <div className="client-admin-action-row">
                        <Link
                          href={`/stylists/${vendor.slug}`}
                          className="client-admin-button client-admin-button-secondary"
                        >
                          View profile
                        </Link>
                        <Link
                          href={`/book/${vendor.slug}`}
                          className="client-admin-button client-admin-button-primary"
                        >
                          Book now
                        </Link>
                        <Button
                          type="button"
                          variant="ghost"
                          className="client-admin-button client-admin-button-ghost"
                          onClick={() => handleRemoveFavorite(vendor.slug)}
                          disabled={loading.favorite === vendor.slug}
                        >
                          {loading.favorite === vendor.slug ? "Removing..." : "Remove"}
                        </Button>
                      </div>
                    </Card>
                  ))
                ) : (
                  <div className="client-admin-empty">
                    <strong>No saved stylists yet</strong>
                    <p>Once you save providers here, rebooking will stay fast and familiar.</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        ) : null}

        {activeTab === "messages" ? (
          <div className="client-admin-content-stack">
            <div className="client-messenger-layout">
              {/* Conversation List */}
              <div className="client-messenger-list">
                <div className="client-messenger-list-header">
                  <h3>Chats</h3>
                  <div className="client-messenger-list-actions">
                    <button type="button" title="More options"><MoreHorizontal size={20} /></button>
                  </div>
                </div>
                <div className="client-messenger-search">
                  <Search size={16} />
                  <input
                    type="text"
                    placeholder="Search Messenger"
                    value={conversationSearch}
                    onChange={(e) => setConversationSearch(e.target.value)}
                  />
                </div>
                <div className="client-messenger-conversations">
                  {conversations.filter((c) => {
                    const term = conversationSearch.toLowerCase();
                    if (!term) return true;
                    return (
                      (c.vendorName || "").toLowerCase().includes(term) ||
                      (c.serviceName || "").toLowerCase().includes(term)
                    );
                  }).length ? (
                    conversations.filter((c) => {
                      const term = conversationSearch.toLowerCase();
                      if (!term) return true;
                      return (
                        (c.vendorName || "").toLowerCase().includes(term) ||
                        (c.serviceName || "").toLowerCase().includes(term)
                      );
                    }).map((conversation) => (
                      <button
                        key={conversation.id}
                        type="button"
                        className={`client-messenger-chat-item ${activeConversationId === conversation.id ? "active" : ""}`}
                        onClick={() => setActiveConversationId(conversation.id)}
                      >
                        <div className="client-messenger-chat-avatar">
                          {getInitials(conversation.vendorName)}
                        </div>
                        <div className="client-messenger-chat-info">
                          <div className="client-messenger-chat-top">
                            <strong>{conversation.vendorName || "Stylist"}</strong>
                            <span className="client-messenger-chat-time">
                              {conversation.lastMessageAt ? formatMessageTime(conversation.lastMessageAt) : ""}
                            </span>
                          </div>
                          <div className="client-messenger-chat-bottom">
                            <span className="client-messenger-chat-preview">
                              {conversation.lastMessagePreview || "No messages yet"}
                            </span>
                            {conversation.clientUnreadCount ? (
                              <span className="client-messenger-unread-badge">{conversation.clientUnreadCount}</span>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="client-messenger-empty">
                      <p>No conversations found.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Thread */}
              <div className="client-messenger-thread">
                {activeConversation ? (
                  <>
                    <div className="client-messenger-thread-header">
                      <div className="client-messenger-thread-user">
                        <div className="client-messenger-thread-avatar">
                          {getInitials(activeConversation.vendorName)}
                        </div>
                        <div>
                          <strong>{activeConversation.vendorName || "Stylist"}</strong>
                          <p>{activeConversation.serviceName}{activeConversation.appointmentDate ? ` · ${formatAppointmentDate(activeConversation.appointmentDate)}` : ""}</p>
                        </div>
                      </div>
                      <div className="client-messenger-thread-actions">
                        <button type="button" title="Call"><Phone size={18} /></button>
                        <button type="button" title="Info"><Info size={18} /></button>
                      </div>
                    </div>

                    <div className="client-messenger-messages">
                      {messageThread.loading ? (
                        <p style={{ textAlign: "center", color: "#94a3b8", margin: "auto" }}>Loading conversation...</p>
                      ) : null}
                      {messageThread.error ? (
                        <p style={{ textAlign: "center", color: "#dc2626", margin: "auto" }}>{messageThread.error}</p>
                      ) : null}
                      {!messageThread.loading && activeConversation && messageThread.messages.length ? (
                        (() => {
                          const rows = [];
                          let lastDate = null;
                          messageThread.messages.forEach((message, index) => {
                            const showDate = !lastDate || !isSameDay(lastDate, message.createdAt);
                            if (showDate) {
                              rows.push(
                                <div key={`date-${index}`} className="client-messenger-date-divider">
                                  <span>{formatMessageDate(message.createdAt)}</span>
                                </div>
                              );
                              lastDate = message.createdAt;
                            }
                            const isMine = message.senderRole === "client";
                            const media = parseMediaUrl(message.body);
                            rows.push(
                              <div key={message.id} className={`client-messenger-bubble-row ${isMine ? "mine" : ""}`}>
                                {!isMine ? (
                                  <div className="client-messenger-bubble-avatar">
                                    {getInitials(activeConversation.vendorName)}
                                  </div>
                                ) : null}
                                <div className={`client-messenger-bubble ${isMine ? "mine" : ""}`}>
                                  {media?.type === "image" ? (
                                    <img
                                      src={media.url}
                                      alt="Attachment"
                                      style={{ maxWidth: 220, borderRadius: 12, display: "block", cursor: "pointer" }}
                                      onClick={() => setLightboxImage(media.url)}
                                    />
                                  ) : media?.type === "video" ? (
                                    <video src={media.url} controls style={{ maxWidth: 220, borderRadius: 12, display: "block" }} />
                                  ) : (
                                    <p>{message.body}</p>
                                  )}
                                  <span className="client-messenger-bubble-time">{formatMessageTime(message.createdAt)}</span>
                                </div>
                              </div>
                            );
                          });
                          return rows;
                        })()
                      ) : !messageThread.loading && activeConversation ? (
                        <div className="client-messenger-empty-thread">
                          <p>No messages yet. Send the first note.</p>
                        </div>
                      ) : (
                        <div className="client-messenger-empty-thread">
                          <p>Select a conversation to start messaging.</p>
                        </div>
                      )}
                    </div>

                    <form onSubmit={handleSendMessage} className="client-messenger-input-bar">
                      <input
                        ref={(el) => { if (el && !window.clientChatFileInput) window.clientChatFileInput = el; }}
                        type="file"
                        accept="image/*,video/*"
                        style={{ display: "none" }}
                        onChange={async (event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          try {
                            const formData = new FormData();
                            formData.append("file", file);
                            formData.append("folder", "messages");
                            const response = await fetch("/api/uploads", { method: "POST", body: formData });
                            const data = await response.json();
                            if (!response.ok) throw new Error(data.error || "Upload failed.");
                            await handleSendMessage(data.url);
                          } catch (error) {
                            setMessageThread((current) => ({ ...current, error: error.message }));
                          }
                          event.target.value = "";
                        }}
                      />
                      <div style={{ position: "relative" }}>
                        <button
                          type="button"
                          className="client-messenger-input-action"
                          title="Add attachment"
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            window.clientAttachmentPos = { left: rect.left, bottom: window.innerHeight - rect.top };
                            setShowAttachmentMenu((s) => !s);
                          }}
                        >
                          <Plus size={20} />
                        </button>
                        {showAttachmentMenu ? (
                          <div
                            className="chat-attachment-menu"
                            style={{
                              position: "fixed",
                              left: Math.max(8, (window.clientAttachmentPos?.left || 0) - 80),
                              bottom: (window.clientAttachmentPos?.bottom || 50) + 8,
                              top: "auto",
                              right: "auto"
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setShowAttachmentMenu(false);
                                window.clientChatFileInput?.click();
                              }}
                            >
                              <ImageIcon size={18} /> Picture
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowAttachmentMenu(false);
                                window.clientChatFileInput?.click();
                              }}
                            >
                              <Video size={18} /> Video
                            </button>
                          </div>
                        ) : null}
                      </div>
                      <div className="client-messenger-input-wrap">
                        <input
                          type="text"
                          placeholder="Aa"
                          value={messageThread.draft}
                          onChange={(event) =>
                            setMessageThread((current) => ({ ...current, draft: event.target.value }))
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter" && !event.shiftKey) {
                              event.preventDefault();
                              handleSendMessage();
                            }
                          }}
                        />
                        <div style={{ position: "relative" }}>
                          <button
                            type="button"
                            className="client-messenger-input-action"
                            title="Emoji"
                            onClick={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              window.clientEmojiPos = { right: window.innerWidth - rect.right, bottom: window.innerHeight - rect.top };
                              setShowEmojiPicker((s) => !s);
                            }}
                          >
                            <Smile size={20} />
                          </button>
                          {showEmojiPicker ? (
                            <div
                              style={{
                                position: "fixed",
                                bottom: (window.clientEmojiPos?.bottom || 50) + 8,
                                right: Math.max(8, window.clientEmojiPos?.right || 8),
                                top: "auto",
                                left: "auto",
                                background: "#ffffff",
                                borderRadius: 12,
                                boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                                padding: 10,
                                display: "grid",
                                gridTemplateColumns: "repeat(10, 1fr)",
                                gap: 4,
                                zIndex: 9999,
                                width: 280,
                                border: "1px solid #e5e7eb"
                              }}
                            >
                              {["😀","😂","🥰","😍","😎","🤔","😢","😡","👍","👎","🙏","🔥","❤️","🎉","✅","❌","👋","🤝","💇","💇‍♀️"].map((emoji) => (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => {
                                    setMessageThread((current) => ({
                                      ...current,
                                      draft: (current.draft || "") + emoji
                                    }));
                                    setShowEmojiPicker(false);
                                  }}
                                  style={{
                                    background: "transparent",
                                    border: "none",
                                    cursor: "pointer",
                                    fontSize: 20,
                                    padding: 4,
                                    borderRadius: 6,
                                    lineHeight: 1,
                                    color: "#0f172a"
                                  }}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="client-messenger-send-btn"
                        disabled={messageThread.sending || !messageThread.draft.trim()}
                      >
                        <Send size={20} />
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="client-messenger-no-chat">
                    <MessageSquareText size={48} style={{ opacity: 0.4 }} />
                    <p>Select a conversation to start messaging</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === "profile" ? (
          <div className="client-admin-content-stack">
            <div className="client-admin-section-tabs" role="tablist" aria-label="Account sections">
              {ACCOUNT_SECTION_OPTIONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`client-admin-section-tab ${accountSection === item.id ? "active" : ""}`}
                  onClick={() => setAccountSection(item.id)}
                  role="tab"
                  aria-selected={accountSection === item.id}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {accountSection === "details" ? (
              <Card className="client-admin-panel">
                <div className="client-admin-panel-head">
                  <div>
                    <h2>Profile Details</h2>
                  </div>
                </div>

                <form onSubmit={handleProfileSubmit} className="client-admin-form-grid">
                  <div className="client-admin-field span-2">
                    <Label htmlFor="client-avatar-upload">Profile photo</Label>
                    <div className="client-admin-photo-picker">
                      <div className="client-admin-photo-preview">
                        {profileForm.avatar ? (
                          <img
                            src={profileForm.avatar}
                            alt={`${profileForm.name || displayName} profile`}
                            className="client-admin-photo-image"
                          />
                        ) : (
                          <span>{getInitials(profileForm.name || displayName)}</span>
                        )}
                      </div>

                      <div className="client-admin-photo-copy">
                        <strong>
                          {avatarFileName
                            ? avatarFileName
                            : profileForm.avatar
                              ? "Current profile photo"
                              : "No profile photo selected"}
                        </strong>
                        <p>Choose a JPG, PNG, or WebP image from your device. Max file size: 2 MB.</p>
                        <small>Your new photo will update after you save the profile.</small>

                        <input
                          ref={avatarFileInputRef}
                          id="client-avatar-upload"
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="client-admin-file-input"
                          onChange={handleAvatarFileChange}
                        />

                        <div className="client-admin-action-row">
                          <Button
                            type="button"
                            variant="outline"
                            className="client-admin-button client-admin-button-secondary"
                            onClick={() => avatarFileInputRef.current?.click()}
                          >
                            <ImagePlus size={16} /> Change profile photo
                          </Button>

                          {profileForm.avatar ? (
                            <Button
                              type="button"
                              variant="ghost"
                              className="client-admin-button client-admin-button-ghost"
                              onClick={handleRemoveAvatar}
                            >
                              Remove photo
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="client-admin-field">
                    <Label htmlFor="client-name">Full name</Label>
                    <Input
                      id="client-name"
                      className="form-control"
                      value={profileForm.name}
                      onChange={(event) =>
                        setProfileForm((current) => ({ ...current, name: event.target.value }))
                      }
                      required
                    />
                  </div>

                  <div className="client-admin-field">
                    <Label htmlFor="client-email">Email</Label>
                    <Input
                      id="client-email"
                      className="form-control"
                      value={profileForm.email}
                      readOnly
                    />
                  </div>

                  <div className="client-admin-field">
                    <Label htmlFor="client-phone">Phone number</Label>
                    <Input
                      id="client-phone"
                      className="form-control"
                      value={profileForm.phone}
                      onChange={(event) =>
                        setProfileForm((current) => ({ ...current, phone: event.target.value }))
                      }
                      placeholder="+1 (213) 555-0147"
                    />
                  </div>

                  <div className="client-admin-field">
                    <Label htmlFor="client-city">City</Label>
                    <Input
                      id="client-city"
                      className="form-control"
                      value={profileForm.city}
                      onChange={(event) =>
                        setProfileForm((current) => ({ ...current, city: event.target.value }))
                      }
                      placeholder="Los Angeles"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="client-admin-button client-admin-button-primary span-2"
                    disabled={loading.profile}
                  >
                    {loading.profile ? "Saving..." : "Save profile"}
                  </Button>
                </form>
              </Card>
            ) : null}

            {accountSection === "security" ? (
              <Card className="client-admin-panel">
                <div className="client-admin-panel-head">
                  <div>
                    <h2>Security & Linked Methods</h2>
                    <p>Review what is connected to this account, sign out when needed, or delete the client profile to free this Google login for a stylist account.</p>
                  </div>
                </div>

                <div className="client-admin-methods">
                  {dashboard?.profile?.linkedMethods?.map((method) => (
                    <div key={method.id} className="client-admin-list-item compact">
                      <div className="client-admin-method-label">
                        {method.id === "email" ? <UserRound size={16} /> : null}
                        {method.id === "phone" ? <Bell size={16} /> : null}
                        {method.id === "google" ? <Sparkles size={16} /> : null}
                        <strong>{linkedMethodLabel(method)}</strong>
                      </div>
                      <Badge
                        variant="secondary"
                        className={`client-admin-status ${method.connected ? "success" : "muted"}`}
                      >
                        {method.connected ? "Connected" : "Not linked"}
                      </Badge>
                    </div>
                  ))}
                </div>

                <div className="client-admin-highlight compact">
                  <div>
                    <strong>{linkedMethodCount} linked method(s)</strong>
                    <p>
                      {linkedMethodCount} of {totalLinkedMethods} available sign-in methods are connected.
                    </p>
                  </div>
                </div>

                <div
                  className="client-admin-highlight compact"
                  style={{ borderColor: "#fecaca", background: "#fef2f2" }}
                >
                  <div>
                    <strong>Delete client account</strong>
                    <p>
                      Use this only if you want this Google email to stop belonging to the client side so it can be used for a stylist account instead.
                    </p>
                  </div>
                </div>

                <div className="client-admin-action-row">
                  <Button
                    type="button"
                    variant="ghost"
                    className="client-admin-button client-admin-button-ghost"
                    onClick={handleSignOut}
                    disabled={loading.signout}
                  >
                    {loading.signout ? "Signing out..." : "Sign out"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="client-admin-button client-admin-button-secondary"
                    onClick={handleDeleteAccount}
                    disabled={loading.deleteAccount}
                  >
                    {loading.deleteAccount ? "Deleting..." : "Delete client account"}
                  </Button>
                </div>
              </Card>
            ) : null}

            {accountSection === "password" ? (
              <Card className="client-admin-panel">
                <div className="client-admin-panel-head">
                  <div>
                    <h2>Change Password</h2>
                    <p>Update your password separately from the rest of your account details</p>
                  </div>
                </div>

                {canChangePassword ? (
                  <form onSubmit={handlePasswordSubmit} className="client-admin-password-form">
                    <div className="client-admin-field">
                      <Label htmlFor="current-password">Current password</Label>
                      <Input
                        id="current-password"
                        type="password"
                        className="form-control"
                        value={passwordForm.currentPassword}
                        onChange={(event) =>
                          setPasswordForm((current) => ({
                            ...current,
                            currentPassword: event.target.value
                          }))
                        }
                      />
                    </div>

                    <div className="client-admin-field">
                      <Label htmlFor="new-password">New password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        className="form-control"
                        value={passwordForm.password}
                        onChange={(event) =>
                          setPasswordForm((current) => ({
                            ...current,
                            password: event.target.value
                          }))
                        }
                      />
                    </div>

                    <div className="client-admin-field">
                      <Label htmlFor="confirm-password">Confirm new password</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        className="form-control"
                        value={passwordForm.confirmPassword}
                        onChange={(event) =>
                          setPasswordForm((current) => ({
                            ...current,
                            confirmPassword: event.target.value
                          }))
                        }
                      />
                    </div>

                    <div className="client-admin-action-row">
                      <Button
                        type="submit"
                        className="client-admin-button client-admin-button-primary"
                        disabled={loading.password}
                      >
                        {loading.password ? "Updating..." : "Change password"}
                      </Button>
                      <Badge variant="secondary" className="client-admin-chip">
                        <LockKeyhole size={15} /> Minimum 8 characters
                      </Badge>
                    </div>
                  </form>
                ) : (
                  <div className="client-admin-empty compact">
                    <p>This account signs in without an email password, so password changes are not available here.</p>
                  </div>
                )}
              </Card>
            ) : null}

            {accountSection === "preferences" ? (
              <Card className="client-admin-panel">
                <div className="client-admin-panel-head">
                  <div>
                    <h2>Preferences</h2>
                    <p>Choose which booking, reminder, and security updates stay enabled</p>
                  </div>
                </div>

                <form onSubmit={handlePreferenceSubmit} className="client-admin-preferences">
                  {PREFERENCE_OPTIONS.map((item) => (
                    <label key={item.key} className="client-admin-toggle">
                      <input
                        type="checkbox"
                        checked={preferenceForm[item.key]}
                        onChange={(event) =>
                          setPreferenceForm((current) => ({
                            ...current,
                            [item.key]: event.target.checked
                          }))
                        }
                      />
                      <span>
                        <strong>{item.label}</strong>
                        <small>{item.description}</small>
                      </span>
                    </label>
                  ))}

                  <Button
                    type="submit"
                    className="client-admin-button client-admin-button-primary"
                    disabled={loading.preferences}
                  >
                    {loading.preferences ? "Saving..." : "Save preferences"}
                  </Button>
                </form>
              </Card>
            ) : null}
          </div>
        ) : null}
      </section>

      {avatarEditor.open ? (
        <div className="client-admin-modal-backdrop" onClick={handleCloseAvatarEditor}>
          <div
            className="client-admin-modal client-admin-avatar-editor"
            role="dialog"
            aria-modal="true"
            aria-labelledby="client-avatar-editor-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="client-admin-modal-head">
              <div>
                <h2 id="client-avatar-editor-title">Edit profile photo</h2>
                <p>Drag to crop, then fine-tune scale and image balance before applying it.</p>
              </div>

              <Button
                type="button"
                variant="ghost"
                className="client-admin-button client-admin-button-ghost"
                onClick={handleCloseAvatarEditor}
                disabled={avatarEditor.processing}
              >
                Cancel
              </Button>
            </div>

            <div className="client-admin-avatar-editor-body">
              <div className="client-admin-avatar-stage-wrap">
                <div
                  className="client-admin-avatar-stage"
                  onPointerDown={handleAvatarEditorPointerDown}
                  onPointerMove={handleAvatarEditorPointerMove}
                  onPointerUp={handleAvatarEditorPointerEnd}
                  onPointerCancel={handleAvatarEditorPointerEnd}
                >
                  <img
                    src={avatarEditor.source}
                    alt="Selected profile"
                    className="client-admin-avatar-stage-image"
                    style={{
                      width: `${avatarPreviewMetrics.renderedWidth}px`,
                      height: `${avatarPreviewMetrics.renderedHeight}px`,
                      left: `${(AVATAR_EDITOR_FRAME_SIZE - avatarPreviewMetrics.renderedWidth) / 2 + avatarEditor.offsetX}px`,
                      top: `${(AVATAR_EDITOR_FRAME_SIZE - avatarPreviewMetrics.renderedHeight) / 2 + avatarEditor.offsetY}px`,
                      filter: `brightness(${avatarEditor.brightness}%) contrast(${avatarEditor.contrast}%)`
                    }}
                  />
                  <div className="client-admin-avatar-stage-grid" />
                </div>
                <p className="client-admin-avatar-stage-tip">
                  Drag the image to set the crop. The final photo saves as a square profile picture.
                </p>
              </div>

              <div className="client-admin-avatar-controls">
                <div className="client-admin-avatar-control">
                  <div className="client-admin-avatar-control-head">
                    <label htmlFor="avatar-editor-scale">Scale</label>
                    <span>{avatarEditor.scale.toFixed(2)}x</span>
                  </div>
                  <input
                    id="avatar-editor-scale"
                    type="range"
                    min="1"
                    max="2.8"
                    step="0.01"
                    value={avatarEditor.scale}
                    onChange={handleAvatarEditorScaleChange}
                  />
                </div>

                <div className="client-admin-avatar-control">
                  <div className="client-admin-avatar-control-head">
                    <label htmlFor="avatar-editor-brightness">Brightness</label>
                    <span>{avatarEditor.brightness}%</span>
                  </div>
                  <input
                    id="avatar-editor-brightness"
                    type="range"
                    min="70"
                    max="140"
                    step="1"
                    value={avatarEditor.brightness}
                    onChange={(event) =>
                      handleAvatarEditorAdjustChange("brightness", event.target.value)
                    }
                  />
                </div>

                <div className="client-admin-avatar-control">
                  <div className="client-admin-avatar-control-head">
                    <label htmlFor="avatar-editor-contrast">Contrast</label>
                    <span>{avatarEditor.contrast}%</span>
                  </div>
                  <input
                    id="avatar-editor-contrast"
                    type="range"
                    min="80"
                    max="140"
                    step="1"
                    value={avatarEditor.contrast}
                    onChange={(event) =>
                      handleAvatarEditorAdjustChange("contrast", event.target.value)
                    }
                  />
                </div>

                {avatarEditor.error ? (
                  <div className="client-admin-avatar-error">{avatarEditor.error}</div>
                ) : null}

                <div className="client-admin-action-row">
                  <Button
                    type="button"
                    variant="outline"
                    className="client-admin-button client-admin-button-secondary"
                    onClick={handleAvatarEditorReset}
                    disabled={avatarEditor.processing}
                  >
                    Reset adjustments
                  </Button>

                  <Button
                    type="button"
                    className="client-admin-button client-admin-button-primary"
                    onClick={handleApplyAvatarEditor}
                    disabled={avatarEditor.processing}
                  >
                    {avatarEditor.processing ? "Applying..." : "Apply photo"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {activeConversationId && activeTab !== "messages" ? (
        <MessengerWidget
          conversationId={activeConversationId}
          recipientName={activeConversation?.vendorName || "Stylist"}
          recipientAvatar=""
          userRole="client"
          controlledOpen={widgetOpen}
          onToggle={(v) => setWidgetOpen(v)}
          externalMessages={messageThread.messages}
          externalDraft={messageThread.draft}
          externalSending={messageThread.sending}
          externalLoading={messageThread.loading}
          externalError={messageThread.error}
          onSend={(body) => handleSendMessage(body)}
          onDraftChange={(value) => setMessageThread((current) => ({ ...current, draft: value }))}
          onExpand={() => {
            handleTabChange("messages");
            setWidgetOpen(false);
          }}
        />
      ) : null}

      {lightboxImage ? (
        <div className="chat-lightbox-overlay" onClick={() => setLightboxImage("")}>
          <button className="chat-lightbox-close" onClick={() => setLightboxImage("")}>
            <X size={20} />
          </button>
          <img src={lightboxImage} alt="Full size" onClick={(e) => e.stopPropagation()} />
        </div>
      ) : null}
    </div>
  );
}
