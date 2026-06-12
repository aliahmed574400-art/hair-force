"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSocket } from "@/components/providers/SocketProvider";
import {
  Bell,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Edit3,
  GripVertical,
  HelpCircle,
  Image,
  Image as ImageIcon,
  Info,
  KeyRound,
  LayoutDashboard,
  Layers2,
  LogOut,
  Mail,
  MessageSquareText,
  MoreHorizontal,
  Package,
  Paperclip,
  Phone,
  Plus,
  Scissors,
  Search,
  Send,
  ShieldAlert,
  Settings,
  Smile,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  Video,
  X,
  UserRound
} from "lucide-react";
import SiteButton from "@/components/ui/SiteButton";
import VendorAvailabilityAgenda from "@/components/dashboard/VendorAvailabilityAgenda";
import MessengerWidget from "@/components/ui/MessengerWidget";
import AddServiceModal from "@/components/dashboard/AddServiceModal";
import { useWebRTCCall } from "@/hooks/useWebRTCCall";
import { VoiceCallUI, MicPermissionModal } from "@/components/VoiceCallUI";
import { VendorStatusToggle } from "@/components/VendorStatusToggle";
import { formatCurrency } from "@/lib/utils";
import { parseMediaUrl, formatMessageTime, formatMessageDate, isSameDay } from "@/lib/chat-helpers";
import {
  CALENDAR_WEEKDAYS,
  DURATION_OPTIONS,
  OVERVIEW_BOOKING_FILTERS,
  PRODUCT_CATEGORIES,
  PROFESSION_OPTIONS,
  PROFILE_TABS,
  PRONOUN_OPTIONS,
  SERVICE_CATALOG_GROUPS,
  SERVICE_MENU_TABS,
  TIME_OPTIONS,
  VENDOR_NOTIFICATION_OPTIONS
} from "@/components/dashboard/vendorDashboard.constants";
import {
  bookingStatusTone,
  buildCalendarMonth,
  createAvailabilityForm,
  createClientId,
  createNotificationPreferenceForm,
  createPasswordForm,
  createPaymentMethodForm,
  createPortfolioItems,
  createProfileForm,
  defaultProductForm,
  defaultServiceForm,
  formatBillingDate,
  formatDashboardNumber,
  formatDateLabel,
  formatDurationLabel,
  formatLineupDate,
  getAppointmentDateTime,
  getAvatarSwatch,
  getInitials,
  getServiceType,
  initialThreadState,
  isBookableMenuService,
  isPastBooking,
  normalizeAppointmentTime,
  paymentMethodLabel,
  resolveProfileTab,
  resolveSettingsTab,
  resolveVendorSection,
  sanitizePortfolioImages,
  sortBookings
} from "@/components/dashboard/vendorDashboard.helpers";
import {
  uploadFile,
  safeParseResponse
} from "@/lib/client-upload-utils";

// Icon-bearing collections stay here because they reference lucide-react
// components. The string-only set forms used by helpers live in
// vendorDashboard.tabIds.js so the helpers file stays React-free.
const SECTION_OPTIONS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "gallery", label: "Gallery", icon: Image },
  { id: "services", label: "Services", icon: Scissors },
  { id: "availability", label: "Availability", icon: CalendarDays },
  { id: "bookings", label: "Bookings", icon: ClipboardList },
  { id: "messages", label: "Messages", icon: MessageSquareText },
  { id: "settings", label: "Settings", icon: Settings }
];

const SETTINGS_TABS = [
  { id: "notification", label: "Notification", icon: Bell },
  { id: "billing", label: "Plan & Billings", icon: CreditCard },
  { id: "email", label: "Change login email", icon: Mail },
  { id: "password", label: "Change password", icon: KeyRound },
  { id: "delete", label: "Delete stylist account", icon: ShieldAlert }
];

export default function VendorDashboardManager({ user, initialData }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedSection = resolveVendorSection(searchParams.get("section"));
  const requestedProfileTab = resolveProfileTab(searchParams.get("profileTab"));
  const requestedSettingsTab = resolveSettingsTab(searchParams.get("settingsTab"));
  const [dashboard, setDashboard] = useState(initialData);
  const [activeSection, setActiveSection] = useState(requestedSection || "overview");
  const [activeProfileTab, setActiveProfileTab] = useState(requestedProfileTab || "personal");
  const [activeSettingsTab, setActiveSettingsTab] = useState(requestedSettingsTab || "notification");
  const [calendarCursor, setCalendarCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [overviewBookingFilter, setOverviewBookingFilter] = useState("upcoming");
  const [profileForm, setProfileForm] = useState(createProfileForm(initialData.vendor, user));
  const [availabilityForm, setAvailabilityForm] = useState(createAvailabilityForm(initialData.vendor));
  const [blackoutDatesText, setBlackoutDatesText] = useState(
    (initialData.vendor.blackoutDates || []).join(", ")
  );
  const [serviceForm, setServiceForm] = useState(defaultServiceForm());
  const [editingServiceId, setEditingServiceId] = useState("");
  const [serviceMenuTab, setServiceMenuTab] = useState("services");
  const [serviceModal, setServiceModal] = useState({ view: "", mode: "create" });
  const [serviceSearch, setServiceSearch] = useState("");
  const [expandedCatalogGroups, setExpandedCatalogGroups] = useState(new Set());
  const [combinedSelection, setCombinedSelection] = useState([]);
  const [productForm, setProductForm] = useState(defaultProductForm());
  const [editingProductId, setEditingProductId] = useState("");
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [mediaModal, setMediaModal] = useState({ open: false, itemId: "" });
  const [mediaForm, setMediaForm] = useState({
    serviceId: "",
    clientName: "",
    caption: ""
  });
  const [bookingDetailModal, setBookingDetailModal] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showConversations, setShowConversations] = useState(false);
  const [notificationForm, setNotificationForm] = useState(
    createNotificationPreferenceForm(initialData.notificationPreferences)
  );
  const [paymentMethodForm, setPaymentMethodForm] = useState(createPaymentMethodForm());
  const [emailForm, setEmailForm] = useState({
    email: initialData.accountSecurity?.email || user?.email || ""
  });
  const [passwordForm, setPasswordForm] = useState(createPasswordForm());
  const [passwordChangeMeta, setPasswordChangeMeta] = useState({
    email: "",
    secondsLeft: 0,
    step: "form"
  });
  const [status, setStatus] = useState({ type: "", message: "" });
  const [activeConversationId, setActiveConversationId] = useState(initialData.conversations?.[0]?.id || "");
  const [threadState, setThreadState] = useState(initialThreadState());
  const [conversationSearch, setConversationSearch] = useState("");
  const [widgetOpen, setWidgetOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState("");
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
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
    portfolioUpload: false,
    deleteAccount: false,
    notificationPreferences: false,
    addPaymentMethod: false,
    paymentMethod: "",
    loginEmail: false,
    password: false,
    subscribePlan: false,
    signout: false
  });

  const { socket, connected } = useSocket();

  // Voice call state
  const [showMicPermissionModal, setShowMicPermissionModal] = useState(false);

  const handleCallLog = useCallback(async ({ conversationId, duration, durationLabel, missed }) => {
    if (!conversationId) return;
    try {
      const body = missed
        ? "📞 Missed call"
        : `📞 Voice call · ${durationLabel}`;
      await fetch(`/api/dashboard/messages/${conversationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body })
      });
    } catch (error) {
      console.error("Failed to save call log message:", error.message);
    }
  }, []);

  const callAPI = useWebRTCCall({ currentUser: user, onCallLog: handleCallLog });

  // Show microphone permission modal when call hook reports permission error
  useEffect(() => {
    if (callAPI.error?.toLowerCase().includes("microphone access")) {
      setShowMicPermissionModal(true);
    }
    if (callAPI.error && callAPI.callState === "idle") {
      setStatus({ type: "error", message: callAPI.error });
    }
  }, [callAPI.error, callAPI.callState]);

  // Socket.IO: join conversation rooms and listen for new messages
  useEffect(() => {
    if (!socket) return;

    function handleNewMessage({ conversationId: incomingId, messages: incomingMessages }) {
      if (incomingId === activeConversationId) {
        setThreadState((current) => ({
          ...current,
          messages: incomingMessages || current.messages,
          sending: false,
          error: ""
        }));
      }
      // Refresh conversation list to update previews/unread counts
      refreshConversations().catch(() => {});
    }

    function handleNewNotification() {
      refreshNotifications().catch(() => {});
    }

    socket.on("message:new", handleNewMessage);
    socket.on("notification:new", handleNewNotification);

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("notification:new", handleNewNotification);
    };
  }, [socket, activeConversationId]);

  // Socket.IO: join/leave conversation rooms as active conversation changes
  useEffect(() => {
    if (!socket || !activeConversationId) return;
    socket.emit("join_conversation", activeConversationId);
    return () => {
      socket.emit("leave_conversation", activeConversationId);
    };
  }, [socket, activeConversationId]);

  const bookings = dashboard.bookings || [];
  const services = dashboard.services || [];
  const notifications = dashboard.notifications || [];
  const unreadNotificationCount = dashboard.unreadNotificationCount || 0;
  const serviceCategories = useMemo(
    () => services.filter((service) => getServiceType(service) === "category"),
    [services]
  );
  const addOns = useMemo(
    () => services.filter((service) => getServiceType(service) === "addon"),
    [services]
  );
  const bookableServices = useMemo(
    () => services.filter((service) => isBookableMenuService(service)),
    [services]
  );
  const serviceSections = useMemo(() => {
    const sections = [
      {
        id: "",
        title: "Default",
        services: bookableServices.filter((service) => !service.parentCategoryId)
      },
      ...serviceCategories.map((category) => ({
        id: category.id || category._id || category.title,
        title: category.title,
        services: bookableServices.filter(
          (service) => String(service.parentCategoryId || "") === String(category.id || category._id || category.title)
        )
      }))
    ];

    return sections.filter((section) => section.id || section.services.length || !serviceCategories.length);
  }, [bookableServices, serviceCategories]);
  const filteredServiceCatalog = useMemo(() => {
    const query = serviceSearch.trim().toLowerCase();

    if (!query) {
      return SERVICE_CATALOG_GROUPS;
    }

    return SERVICE_CATALOG_GROUPS
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => item.toLowerCase().includes(query))
      }))
      .filter((group) => group.items.length);
  }, [serviceSearch]);
  const conversations = dashboard.conversations || [];
  const unreadMessages = conversations.reduce(
    (sum, item) => sum + Number(item.vendorUnreadCount || 0),
    0
  );
  const uniqueClientCount = useMemo(
    () =>
      new Set(
        bookings
          .map((booking) => booking.customerEmail || booking.customerName)
          .filter(Boolean)
      ).size,
    [bookings]
  );
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
      {
        label: "Total Clients",
        value: formatDashboardNumber(uniqueClientCount),
        meta: "This month",
        accent: "clients"
      },
      {
        label: "Completed",
        value: formatDashboardNumber(completedBookings.length),
        meta: "Appointments",
        accent: "completed"
      },
      {
        label: "Cancel",
        value: formatDashboardNumber(closedBookings.length),
        meta: "Requests",
        accent: "cancelled"
      }
    ],
    [closedBookings.length, completedBookings.length, uniqueClientCount]
  );
  const activeConversation = conversations.find((item) => item.id === activeConversationId) || null;

  const handleCallClick = useCallback(() => {
    if (!activeConversation?.clientId) return;
    callAPI.initiateCall({
      recipientId: activeConversation.clientId,
      recipientName: activeConversation.customerName,
      recipientAvatar: "",
      conversationId: activeConversation.id
    });
  }, [activeConversation, callAPI, connected, socket]);

  const calendarData = useMemo(
    () => buildCalendarMonth(calendarCursor, bookings),
    [bookings, calendarCursor]
  );
  const lineupBookings = useMemo(
    () => {
      const sorted = [...bookings]
        .filter((booking) => !["cancelled", "declined"].includes(booking.status))
        .sort((left, right) => {
          const leftTime = getAppointmentDateTime(left.appointmentDate, left.appointmentSlot)?.getTime() || 0;
          const rightTime = getAppointmentDateTime(right.appointmentDate, right.appointmentSlot)?.getTime() || 0;
          return leftTime - rightTime;
        });
      const upcomingOnly = sorted.filter((booking) => !isPastBooking(booking));

      return (upcomingOnly.length ? upcomingOnly : sorted).slice(0, 5);
    },
    [bookings]
  );
  const overviewBookings = useMemo(() => {
    const todayKey = new Date().toISOString().slice(0, 10);
    const closedStatuses = new Set(["cancelled", "declined"]);
    const filtered = bookings.filter((booking) => {
      if (overviewBookingFilter === "all") {
        return true;
      }

      if (overviewBookingFilter === "today") {
        return booking.appointmentDate === todayKey;
      }

      if (overviewBookingFilter === "past") {
        return isPastBooking(booking);
      }

      if (overviewBookingFilter === "cancelled") {
        return closedStatuses.has(booking.status);
      }

      // upcoming
      return !isPastBooking(booking) && !closedStatuses.has(booking.status);
    });

    return [...filtered]
      .sort((left, right) => {
        const leftTime = getAppointmentDateTime(left.appointmentDate, left.appointmentSlot)?.getTime() || 0;
        const rightTime = getAppointmentDateTime(right.appointmentDate, right.appointmentSlot)?.getTime() || 0;

        if (overviewBookingFilter === "past" || overviewBookingFilter === "cancelled") {
          return rightTime - leftTime;
        }

        return leftTime - rightTime;
      })
      .slice(0, 8);
  }, [bookings, overviewBookingFilter]);

  useEffect(() => {
    setDashboard(initialData);
  }, [initialData]);

  useEffect(() => {
    if (!showNotifications && !showUserMenu && !showConversations) return;

    function handleClickOutside(event) {
      const notificationContainer = document.querySelector(".vendor-notification-bell-container");
      if (notificationContainer && !notificationContainer.contains(event.target)) {
        setShowNotifications(false);
      }
      const userContainer = document.querySelector(".vendor-user-avatar-container");
      if (userContainer && !userContainer.contains(event.target)) {
        setShowUserMenu(false);
      }
      const conversationContainer = document.querySelector(".vendor-message-bell-container");
      if (conversationContainer && !conversationContainer.contains(event.target)) {
        setShowConversations(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNotifications, showUserMenu, showConversations]);

  useEffect(() => {
    const nextSection = requestedSection || "overview";

    setActiveSection((currentSection) =>
      currentSection === nextSection ? currentSection : nextSection
    );
  }, [requestedSection]);

  useEffect(() => {
    if (requestedProfileTab === "media") {
      router.replace(`${pathname}?section=gallery`, { scroll: false });
      return;
    }

    const nextTab = requestedProfileTab || "personal";

    setActiveProfileTab((currentTab) => (currentTab === nextTab ? currentTab : nextTab));
  }, [requestedProfileTab]);

  useEffect(() => {
    const nextTab = requestedSettingsTab || "notification";

    setActiveSettingsTab((currentTab) => (currentTab === nextTab ? currentTab : nextTab));
  }, [requestedSettingsTab]);

  useEffect(() => {
    if (!status.message) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setStatus({ type: "", message: "" });
    }, 10000);

    return () => window.clearTimeout(timeoutId);
  }, [status.message]);

  function handleSectionSelect(nextSection) {
    const resolvedSection = resolveVendorSection(nextSection) || "overview";
    const params = new URLSearchParams(searchParams.toString());

    setActiveSection(resolvedSection);

    if (resolvedSection === "overview") {
      params.delete("section");
    } else {
      params.set("section", resolvedSection);
    }

    if (resolvedSection !== "profile") {
      params.delete("profileTab");
    }

    if (resolvedSection !== "settings") {
      params.delete("settingsTab");
    }

    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }

  function handleProfileTabSelect(nextTab) {
    const resolvedTab = resolveProfileTab(nextTab) || "personal";
    const params = new URLSearchParams(searchParams.toString());

    setActiveSection("profile");
    setActiveProfileTab(resolvedTab);
    params.set("section", "profile");
    params.set("profileTab", resolvedTab);
    params.delete("settingsTab");

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function handleSettingsTabSelect(nextTab) {
    const resolvedTab = resolveSettingsTab(nextTab) || "notification";
    const params = new URLSearchParams(searchParams.toString());

    setActiveSection("settings");
    setActiveSettingsTab(resolvedTab);
    params.set("section", "settings");

    if (resolvedTab === "notification") {
      params.delete("settingsTab");
    } else {
      params.set("settingsTab", resolvedTab);
    }

    params.delete("profileTab");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  useEffect(() => {
    setProfileForm(createProfileForm(initialData.vendor, user));
    setAvailabilityForm(createAvailabilityForm(initialData.vendor));
    setBlackoutDatesText((initialData.vendor.blackoutDates || []).join(", "));
    setNotificationForm(createNotificationPreferenceForm(initialData.notificationPreferences));
    setEmailForm({ email: initialData.accountSecurity?.email || user?.email || "" });
  }, [initialData, user]);

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
    const parsed = await safeParseResponse(response);

    if (!parsed.ok) {
      const message = parsed.data?.error || parsed.text || "Request failed.";
      throw new Error(message);
    }

    const data = parsed.data;
    setDashboard(data);
    setProfileForm(createProfileForm(data.vendor, user));
    setAvailabilityForm(createAvailabilityForm(data.vendor));
    setBlackoutDatesText((data.vendor.blackoutDates || []).join(", "));
    return data;
  }

  async function fetchJson(url, options) {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers || {})
      },
      ...options
    });

    const parsed = await safeParseResponse(response);

    if (!parsed.ok) {
      const message = parsed.data?.error || parsed.text || "Request failed.";
      throw new Error(message);
    }

    return parsed.data;
  }

  async function uploadAsset(file, folder) {
    return uploadFile(file, folder);
  }

  function profilePayload(formState = profileForm) {
    const businessAddress = [
      formState.businessInfo?.streetAddress,
      formState.businessInfo?.suite,
      formState.businessInfo?.city,
      formState.businessInfo?.state,
      formState.businessInfo?.zip
    ]
      .filter(Boolean)
      .join(", ");

    return {
      name: formState.personalInfo?.displayName || formState.name,
      owner: formState.owner || formState.personalInfo?.displayName,
      category: formState.personalInfo?.profession || formState.category,
      state: formState.businessInfo?.state || formState.state,
      city: formState.businessInfo?.city || formState.city,
      area: formState.area,
      location: businessAddress || formState.location,
      heroTag: formState.heroTag,
      tagline: formState.tagline,
      bio: formState.personalInfo?.about || formState.bio,
      coverImage: formState.coverImage,
      avatar: formState.avatar,
      specialties: formState.specialties,
      amenities: formState.amenities,
      serviceLocationType: formState.serviceLocationType,
      portfolioImages: sanitizePortfolioImages(formState.portfolioImages),
      portfolioItems: formState.portfolioItems || [],
      policies: formState.policies,
      socialLinks: formState.socialLinks,
      personalInfo: formState.personalInfo,
      businessInfo: formState.businessInfo,
      products: formState.products || []
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
      if (url) {
        setProfileForm((current) => ({ ...current, [field]: url }));
        setStatus({ type: "success", message: "Image uploaded. Save profile changes to publish it." });
      }
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading((current) => ({ ...current, [loadingKey]: false }));
    }
  }

  async function handlePortfolioUpload(event) {
    const files = Array.from(event.target.files || []);

    if (!files.length) {
      return;
    }

    setLoading((current) => ({ ...current, portfolioUpload: true }));
    setStatus({ type: "", message: "" });

    const nextItems = [];
    const nextImageUrls = [];
    let errorCount = 0;

    try {
      for (const file of files) {
        try {
          const url = await uploadAsset(file, "gallery");
          if (!url) continue;
          const type = file.type?.startsWith("video/") ? "video" : "image";
          nextItems.push({
            id: createClientId("media"),
            url,
            type,
            serviceId: "",
            clientName: "",
            caption: "",
            pinned: false
          });
          if (type === "image") {
            nextImageUrls.push(url);
          }
        } catch (uploadError) {
          errorCount += 1;
        }
      }

      if (!nextItems.length) {
        const errorMessage =
          errorCount === files.length && files.length === 1
            ? "Upload failed. Please check the file type and size (max 4 MB)."
            : `${errorCount} of ${files.length} uploads failed. Please check file types and sizes (max 4 MB).`;
        throw new Error(errorMessage);
      }

      const nextForm = {
        ...profileForm,
        portfolioItems: [...(profileForm.portfolioItems || []), ...nextItems],
        portfolioImages: sanitizePortfolioImages([
          ...(profileForm.portfolioImages || []),
          ...nextImageUrls
        ])
      };
      setProfileForm(nextForm);

      const successMessage =
        errorCount > 0
          ? `${nextItems.length} uploaded, ${errorCount} failed. Save to publish.`
          : `${nextItems.length} item${nextItems.length > 1 ? "s" : ""} uploaded. Save to publish.`;

      await saveProfileChanges(nextForm, successMessage);
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading((current) => ({ ...current, portfolioUpload: false }));
      event.target.value = "";
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

  function updatePersonalInfo(field, value) {
    setProfileForm((current) => ({
      ...current,
      personalInfo: {
        ...current.personalInfo,
        [field]: value
      },
      ...(field === "displayName" ? { name: value } : {}),
      ...(field === "profession" ? { category: value } : {}),
      ...(field === "about" ? { bio: value } : {})
    }));
  }

  function togglePronoun(value) {
    setProfileForm((current) => {
      const pronouns = current.personalInfo?.pronouns || [];
      const hasValue = pronouns.includes(value);
      return {
        ...current,
        personalInfo: {
          ...current.personalInfo,
          pronouns: hasValue ? pronouns.filter((item) => item !== value) : [...pronouns, value]
        }
      };
    });
  }

  function updateBusinessInfo(field, value) {
    setProfileForm((current) => ({
      ...current,
      businessInfo: {
        ...current.businessInfo,
        [field]: value
      },
      ...(field === "businessName" ? { name: value } : {}),
      ...(field === "city" ? { city: value } : {}),
      ...(field === "state" ? { state: value } : {})
    }));
  }

  function updateSpecialtySelection(event) {
    const selected = Array.from(event.target.selectedOptions).map((option) => option.value);
    setProfileForm((current) => ({ ...current, specialties: selected.join(", ") }));
  }

  function openProductModal(product = null) {
    if (product) {
      setEditingProductId(product.id);
      setProductForm({
        name: product.name || "",
        price: String(product.price ?? 0),
        category: product.category || "Shampoo",
        description: product.description || ""
      });
    } else {
      setEditingProductId("");
      setProductForm(defaultProductForm());
    }

    setProductModalOpen(true);
  }

  async function handleProductSubmit(event) {
    event.preventDefault();

    const nextProduct = {
      id: editingProductId || createClientId("product"),
      name: productForm.name,
      price: Number(productForm.price || 0),
      category: productForm.category,
      description: productForm.description
    };
    const products = editingProductId
      ? (profileForm.products || []).map((product) => (product.id === editingProductId ? nextProduct : product))
      : [...(profileForm.products || []), nextProduct];
    const nextForm = { ...profileForm, products };

    setProfileForm(nextForm);
    setProductModalOpen(false);
    await saveProfileChanges(nextForm, editingProductId ? "Product updated." : "Product added.");
    setEditingProductId("");
    setProductForm(defaultProductForm());
  }

  async function deleteProduct(productId) {
    const nextForm = {
      ...profileForm,
      products: (profileForm.products || []).filter((product) => product.id !== productId)
    };

    setProfileForm(nextForm);
    await saveProfileChanges(nextForm, "Product removed.");
  }

  function openMediaEditor(item) {
    setMediaForm({
      serviceId: item.serviceId || "",
      clientName: item.clientName || "",
      caption: item.caption || ""
    });
    setMediaModal({ open: true, itemId: item.id });
  }

  async function saveMediaEditor(event) {
    event.preventDefault();

    const nextForm = {
      ...profileForm,
      portfolioItems: (profileForm.portfolioItems || []).map((item) =>
        item.id === mediaModal.itemId ? { ...item, ...mediaForm } : item
      )
    };

    setProfileForm(nextForm);
    setMediaModal({ open: false, itemId: "" });
    await saveProfileChanges(nextForm, "Gallery item updated.");
  }

  async function deleteMediaItem(itemId) {
    const removedItem = (profileForm.portfolioItems || []).find((item) => item.id === itemId);
    const nextForm = {
      ...profileForm,
      portfolioItems: (profileForm.portfolioItems || []).filter((item) => item.id !== itemId),
      portfolioImages: (profileForm.portfolioImages || []).filter((url) => url !== removedItem?.url)
    };

    setProfileForm(nextForm);
    setMediaModal({ open: false, itemId: "" });
    await saveProfileChanges(nextForm, "Gallery item removed.");
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

  function openAddChooser() {
    setEditingServiceId("");
    setServiceForm(defaultServiceForm());
    setCombinedSelection([]);
    setServiceSearch("");
    setServiceModal({ view: "chooser", mode: "create" });
  }

  function openServiceCatalog() {
    setEditingServiceId("");
    setServiceForm(defaultServiceForm({ serviceType: "service" }));
    setServiceSearch("");
    setServiceModal({ view: "catalog", mode: "create" });
  }

  function openServiceEditor(seed = {}, mode = "create") {
    const nextForm = defaultServiceForm({
      serviceType: seed.serviceType || "service",
      title: seed.title || "",
      duration: seed.duration || "45 Minutes",
      price: seed.price ?? "",
      description: seed.description || "",
      parentCategoryId: seed.parentCategoryId || "",
      includedServiceIds: seed.includedServiceIds || [],
      metadata: seed.metadata || { priceIsStartingAt: true }
    });

    setServiceForm(nextForm);
    setCombinedSelection(nextForm.includedServiceIds || []);
    setServiceModal({ view: "serviceEditor", mode });
  }

  function openAddonEditor(addon = null) {
    setEditingServiceId(addon ? addon.id || addon._id : "");
    setServiceForm(
      defaultServiceForm({
        serviceType: "addon",
        title: addon?.title || "",
        duration: addon?.duration || "30 Minutes",
        price: addon ? String(addon.price ?? 0) : "",
        description: addon?.description || "",
        metadata: addon?.metadata || {
          timeAdded: "after",
          limitedDays: false,
          requireDeposit: false
        }
      })
    );
    setServiceModal({ view: "addonEditor", mode: addon ? "edit" : "create" });
  }

  function openCategoryEditor(category = null) {
    setEditingServiceId(category ? category.id || category._id : "");
    setServiceForm(
      defaultServiceForm({
        serviceType: "category",
        title: category?.title || ""
      })
    );
    setServiceModal({ view: "categoryEditor", mode: category ? "edit" : "create" });
  }

  function openCombinedSelector() {
    setEditingServiceId("");
    setCombinedSelection([]);
    setServiceForm(defaultServiceForm({ serviceType: "combined", duration: "90 Minutes" }));
    setServiceModal({ view: "combinedSelector", mode: "create" });
  }

  function toggleCombinedService(serviceId) {
    setCombinedSelection((current) =>
      current.includes(serviceId)
        ? current.filter((item) => item !== serviceId)
        : [...current, serviceId]
    );
  }

  function continueCombinedService() {
    const selectedServices = bookableServices.filter((service) =>
      combinedSelection.includes(String(service.id || service._id))
    );
    const totalPrice = selectedServices.reduce((sum, service) => sum + Number(service.price || 0), 0);
    const title = selectedServices.length
      ? selectedServices.map((service) => service.title).join(" + ")
      : "Combined Service";

    setServiceForm(
      defaultServiceForm({
        serviceType: "combined",
        title,
        price: totalPrice ? String(totalPrice) : "",
        duration: "90 Minutes",
        includedServiceIds: combinedSelection,
        metadata: { priceIsStartingAt: true }
      })
    );
    setServiceModal({ view: "serviceEditor", mode: "create" });
  }

  async function saveServiceForm(nextForm = serviceForm, serviceIdOverride = editingServiceId) {
    setLoading((current) => ({ ...current, service: true }));
    setStatus({ type: "", message: "" });

    try {
      const serviceId = serviceIdOverride;
      const response = await fetch(
        serviceId ? `/api/dashboard/services/${serviceId}` : "/api/dashboard/services",
        {
          method: serviceId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(nextForm)
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to save service.");
      }

      setDashboard(data);
      setServiceForm(defaultServiceForm());
      setEditingServiceId("");
      setCombinedSelection([]);
      setServiceModal({ view: "", mode: "create" });
      setStatus({ type: "success", message: serviceId ? "Service menu updated." : "Service menu item added." });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading((current) => ({ ...current, service: false }));
    }
  }

  async function handleServiceSubmit(event) {
    event.preventDefault();
    await saveServiceForm(serviceForm);
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
    const nextForm = {
      serviceType: getServiceType(service),
      title: service.title || "",
      duration: service.duration || "",
      price: service.price || "",
      description: service.description || "",
      depositType: service.depositType || "percentage",
      depositValue: service.depositValue || 20,
      imageUrl: service.imageUrl || "",
      featured: Boolean(service.featured),
      bookingMethod: service.bookingMethod || "instant",
      isActive: service.isActive !== false,
      parentCategoryId: service.parentCategoryId || "",
      includedServiceIds: service.includedServiceIds || [],
      sortOrder: service.sortOrder || 0,
      metadata: {
        priceIsStartingAt: service.metadata?.priceIsStartingAt ?? true,
        timeAdded: service.metadata?.timeAdded || "after",
        limitedDays: Boolean(service.metadata?.limitedDays),
        requireDeposit: Boolean(service.metadata?.requireDeposit)
      }
    };

    setServiceForm(nextForm);
    setCombinedSelection(nextForm.includedServiceIds || []);
    setServiceModal({
      view: getServiceType(service) === "addon" ? "addonEditor" : getServiceType(service) === "category" ? "categoryEditor" : "serviceEditor",
      mode: "edit"
    });
    handleSectionSelect("services");
  }

  async function moveServiceToCategory(service, categoryId) {
    const nextForm = {
      serviceType: getServiceType(service),
      title: service.title || "",
      duration: service.duration || "",
      price: String(service.price ?? 0),
      description: service.description || "",
      depositType: service.depositType || "percentage",
      depositValue: service.depositValue ?? 0,
      imageUrl: service.imageUrl || "",
      featured: Boolean(service.featured),
      bookingMethod: service.bookingMethod || "instant",
      isActive: service.isActive !== false,
      parentCategoryId: categoryId || "",
      includedServiceIds: service.includedServiceIds || [],
      sortOrder: service.sortOrder || 0,
      metadata: service.metadata || {}
    };

    const serviceId = service.id || service._id;
    setEditingServiceId(serviceId);
    await saveServiceForm(nextForm, serviceId);
  }

  function handleServiceDrop(event, categoryId) {
    event.preventDefault();
    const serviceId = event.dataTransfer.getData("text/plain");
    const service = bookableServices.find((item) => String(item.id || item._id) === String(serviceId));

    if (!service) {
      return;
    }

    moveServiceToCategory(service, categoryId);
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

  async function refreshNotifications() {
    const response = await fetch("/api/dashboard/notifications", { method: "GET" });
    if (!response.ok) return;
    const data = await response.json();
    setDashboard((current) => ({
      ...current,
      notifications: data.notifications || [],
      unreadNotificationCount: data.unreadNotificationCount ?? 0
    }));
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

  async function markAllNotificationsRead() {
    if (!dashboard.notifications?.length) return;
    try {
      const response = await fetch("/api/dashboard/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "markAllRead" })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.notifications) {
          setDashboard((current) => ({
            ...current,
            notifications: data.notifications,
            unreadNotificationCount: data.unreadNotificationCount ?? 0
          }));
        } else {
          setDashboard((current) => ({
            ...current,
            unreadNotificationCount: 0,
            notifications: (current.notifications || []).map((n) =>
              n.readAt ? n : { ...n, readAt: new Date().toISOString() }
            )
          }));
        }
      }
    } catch {
      // Ignore mark-read errors
    }
  }

  async function handleNotificationClick(notification) {
    if (!notification) return;

    setShowNotifications(false);

    try {
      await fetch(`/api/dashboard/notifications/${notification.id}`, {
        method: "PATCH"
      });
      setDashboard((current) => ({
        ...current,
        unreadNotificationCount: Math.max(0, (current.unreadNotificationCount || 0) - 1),
        notifications: (current.notifications || []).map((n) =>
          n.id === notification.id && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n
        )
      }));
    } catch {
      // Ignore mark-read errors
    }

    if (notification.conversationId) {
      setActiveConversationId(notification.conversationId);
      setWidgetOpen(true);
    }
  }

  function handleConversationClick(conversationId) {
    handleSectionSelect("messages");
    setActiveConversationId(conversationId);
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

  async function handleDeleteAccount() {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        "Delete your stylist account permanently? This removes your vendor profile and frees this Google login for the client side."
      );

      if (!confirmed) {
        return;
      }
    }

    setLoading((current) => ({ ...current, deleteAccount: true }));
    setStatus({ type: "", message: "" });

    try {
      const response = await fetch("/api/dashboard/account", { method: "DELETE" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to delete account.");
      }

      router.push("/");
      router.refresh();
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading((current) => ({ ...current, deleteAccount: false }));
    }
  }

  function toggleNotificationPreference(key) {
    setNotificationForm((current) => ({
      ...current,
      [key]: !current[key]
    }));
  }

  async function handleNotificationSubmit(event) {
    event.preventDefault();
    setLoading((current) => ({ ...current, notificationPreferences: true }));
    setStatus({ type: "", message: "" });

    try {
      const data = await fetchJson("/api/dashboard/notifications/preferences", {
        method: "PUT",
        body: JSON.stringify(notificationForm)
      });
      setDashboard((current) => ({
        ...current,
        notificationPreferences: data.preferences
      }));
      setStatus({ type: "success", message: "Notification preferences saved." });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading((current) => ({ ...current, notificationPreferences: false }));
    }
  }

  async function handleAddPaymentMethod(event) {
    event.preventDefault();
    setLoading((current) => ({ ...current, addPaymentMethod: true }));
    setStatus({ type: "", message: "" });

    try {
      const data = await fetchJson("/api/dashboard/payments", {
        method: "POST",
        body: JSON.stringify({
          ...paymentMethodForm,
          expMonth: Number(paymentMethodForm.expMonth || 0),
          expYear: Number(paymentMethodForm.expYear || 0)
        })
      });
      setDashboard(data);
      setPaymentMethodForm(createPaymentMethodForm());
      setStatus({ type: "success", message: "Payment method saved for plan billing." });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading((current) => ({ ...current, addPaymentMethod: false }));
    }
  }

  async function handleSetDefaultPaymentMethod(methodId) {
    setLoading((current) => ({ ...current, paymentMethod: methodId }));
    setStatus({ type: "", message: "" });

    try {
      const data = await fetchJson(`/api/dashboard/payments/methods/${methodId}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "setDefault" })
      });
      setDashboard(data);
      setStatus({ type: "success", message: "Default billing card updated." });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading((current) => ({ ...current, paymentMethod: "" }));
    }
  }

  async function handleRemovePaymentMethod(methodId) {
    setLoading((current) => ({ ...current, paymentMethod: methodId }));
    setStatus({ type: "", message: "" });

    try {
      const data = await fetchJson(`/api/dashboard/payments/methods/${methodId}`, {
        method: "DELETE"
      });
      setDashboard(data);
      setStatus({ type: "success", message: "Payment method removed." });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading((current) => ({ ...current, paymentMethod: "" }));
    }
  }

  async function handleSubscribePlan() {
    const defaultMethod =
      dashboard.billing?.defaultPaymentMethod ||
      dashboard.billing?.paymentMethods?.[0] ||
      null;

    if (!defaultMethod) {
      setStatus({ type: "error", message: "Add a payment method before subscribing." });
      return;
    }

    setLoading((current) => ({ ...current, subscribePlan: true }));

    window.setTimeout(() => {
      setStatus({
        type: "success",
        message: `${paymentMethodLabel(defaultMethod)} is ready for Premium Plan billing.`
      });
      setLoading((current) => ({ ...current, subscribePlan: false }));
    }, 250);
  }

  async function handleEmailSubmit(event) {
    event.preventDefault();
    setLoading((current) => ({ ...current, loginEmail: true }));
    setStatus({ type: "", message: "" });

    try {
      const data = await fetchJson("/api/dashboard/security/email", {
        method: "PUT",
        body: JSON.stringify(emailForm)
      });
      setDashboard((current) => ({
        ...current,
        accountSecurity: {
          ...(current.accountSecurity || {}),
          email: data.user?.email || emailForm.email
        }
      }));
      setStatus({ type: "success", message: "Login email updated." });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading((current) => ({ ...current, loginEmail: false }));
    }
  }

  async function requestPasswordChangeCode() {
    setLoading((current) => ({ ...current, password: true }));
    setStatus({ type: "", message: "" });

    try {
      const response = await fetch("/api/dashboard/security/password/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not send verification code.");
      }

      setPasswordChangeMeta({
        email: data.email,
        secondsLeft: Number(data.expiresIn || 60),
        step: "verify"
      });
      setStatus({ type: "success", message: `Verification code sent to ${data.email}.` });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading((current) => ({ ...current, password: false }));
    }
  }

  useEffect(() => {
    if (passwordChangeMeta.step !== "verify" || passwordChangeMeta.secondsLeft <= 0) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setPasswordChangeMeta((current) =>
        current.secondsLeft > 0
          ? { ...current, secondsLeft: current.secondsLeft - 1 }
          : current
      );
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [passwordChangeMeta.step, passwordChangeMeta.secondsLeft]);

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    setLoading((current) => ({ ...current, password: true }));
    setStatus({ type: "", message: "" });

    try {
      await fetchJson("/api/dashboard/security/password", {
        method: "POST",
        body: JSON.stringify(passwordForm)
      });
      setPasswordForm(createPasswordForm());
      setPasswordChangeMeta({ email: "", secondsLeft: 0, step: "form" });
      setStatus({ type: "success", message: "Password updated." });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setLoading((current) => ({ ...current, password: false }));
    }
  }

  async function openConversationForBooking(bookingId) {
    handleSectionSelect("messages");

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

  async function sendMessage(eventOrBody) {
    if (eventOrBody?.preventDefault) {
      eventOrBody.preventDefault();
    }

    const bodyText = typeof eventOrBody === "string" ? eventOrBody : threadState.draft;

    if (!activeConversationId || !bodyText.trim() || threadState.sending) {
      return;
    }

    setThreadState((current) => ({
      ...current,
      sending: true,
      error: "",
      draft: ""
    }));

    try {
      const response = await fetch(`/api/dashboard/messages/${activeConversationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: bodyText.trim() })
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
      try {
        await refreshConversations();
      } catch {
        // Refresh failure is non-critical; polling will catch up
      }
    } catch (error) {
      setThreadState((current) => ({ ...current, sending: false, error: error.message }));
    }
  }

  const selectedSpecialties = String(profileForm.specialties || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const activeMediaItem = (profileForm.portfolioItems || []).find((item) => item.id === mediaModal.itemId) || null;
  const shownPhoneNumber =
    profileForm.businessInfo?.numberShownOnProfile === "personalPhoneNumber"
      ? profileForm.businessInfo?.personalPhoneNumber
      : profileForm.businessInfo?.salonNumber;
  const accountSecurity = dashboard.accountSecurity || {
    email: user?.email || "",
    authProvider: user?.googleId ? "google" : user?.appleId ? "apple" : "email",
    canChangeLoginEmail: Boolean(user?.email && !user?.googleId && !user?.appleId),
    canChangePassword: Boolean(user?.email && !user?.googleId && !user?.appleId)
  };
  const billing = dashboard.billing || {
    plan: { name: "Premium Plan", priceMonthly: 35, currency: "USD", features: [] },
    paymentMethods: [],
    defaultPaymentMethod: null
  };
  const billingPlan = billing.plan || {};
  const billingPaymentMethods = billing.paymentMethods || [];
  const defaultBillingMethod =
    billing.defaultPaymentMethod ||
    billingPaymentMethods.find((method) => method.isDefault) ||
    billingPaymentMethods[0] ||
    null;
  const canUseEmailLogin = Boolean(
    accountSecurity.canChangeLoginEmail && accountSecurity.canChangePassword
  );

  const handleWidgetSend = useCallback(
    (body) => sendMessage(body),
    [sendMessage]
  );
  const handleWidgetDraftChange = useCallback(
    (value) => setThreadState((current) => ({ ...current, draft: value })),
    []
  );
  const handleWidgetLoadMessages = useCallback(
    () => loadConversation(activeConversationId),
    [activeConversationId, loadConversation]
  );
  const handleWidgetExpand = useCallback(() => {
    handleSectionSelect("messages");
    setWidgetOpen(false);
  }, [handleSectionSelect]);

  return (
    <div className="vendor-reference-shell">
      <aside className="vendor-reference-sidebar" aria-label="Vendor dashboard navigation">
        <div className="vendor-reference-sidebar-mark">
          <Sparkles size={18} />
        </div>

        <nav className="vendor-reference-sidebar-nav">
          {SECTION_OPTIONS.map((section) => {
            const Icon = section.icon;
            const badgeCount =
              section.id === "bookings"
                ? pendingBookings.length
                : section.id === "messages"
                  ? unreadMessages
                  : 0;

            return (
              <button
                key={section.id}
                type="button"
                className={`vendor-reference-sidebar-button ${activeSection === section.id ? "active" : ""}`}
                onClick={() => handleSectionSelect(section.id)}
                aria-label={section.label}
                title={section.label}
              >
                <Icon size={18} />
                {badgeCount ? <span className="vendor-reference-sidebar-badge">{badgeCount}</span> : null}
              </button>
            );
          })}
        </nav>

        <div className="vendor-reference-sidebar-foot">
          <button
            type="button"
            className="vendor-reference-sidebar-button"
            onClick={handleSignOut}
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <div className="vendor-reference-main">
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, padding: "14px 18px 0" }}>
          {/* Notification Bell */}
          <div className="vendor-notification-bell-container" style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => {
                const next = !showNotifications;
                setShowNotifications(next);
                setShowUserMenu(false);
                if (next && unreadNotificationCount > 0) {
                  markAllNotificationsRead();
                }
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
              {unreadNotificationCount > 0 ? (
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
                  {unreadNotificationCount}
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
                {notifications.length === 0 ? (
                  <div style={{ padding: 20, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                    No notifications yet.
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => handleNotificationClick(notification)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "12px 16px",
                        border: "none",
                        borderBottom: "1px solid #f1f5f9",
                        background: notification.readAt ? "#fff" : "#f0f7ff",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        gap: 4
                      }}
                    >
                      <strong style={{ fontSize: 13, color: "#0f172a" }}>{notification.title}</strong>
                      <span style={{ fontSize: 12, color: "#64748b", lineHeight: 1.4 }}>{notification.message}</span>
                      {notification.metadata?.preview ? (
                        <span style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic" }}>
                          &quot;{notification.metadata.preview}&quot;
                        </span>
                      ) : null}
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>

          {/* Message Icon */}
          <div className="vendor-message-bell-container" style={{ position: "relative" }}>
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
                        background: conversation.vendorUnreadCount > 0 ? "#f0f7ff" : "#fff",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        gap: 4
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <strong style={{ fontSize: 13, color: "#0f172a" }}>{conversation.customerName || "Client"}</strong>
                        {conversation.vendorUnreadCount > 0 ? (
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
                            {conversation.vendorUnreadCount}
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
          <div className="vendor-user-avatar-container" style={{ position: "relative" }}>
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
                  {getInitials(profileForm.personalInfo.displayName || profileForm.name || user?.name || "Vendor")}
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
                  onClick={() => { setShowUserMenu(false); handleSectionSelect("profile"); }}
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
                  onClick={() => { setShowUserMenu(false); handleSectionSelect("settings"); }}
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
                  Settings
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

        {status.message ? (
          <div
            className={`vendor-reference-alert ${status.type === "error" ? "error" : ""}`}
            style={{ margin: "12px 18px 0" }}
          >
            {status.message}
          </div>
        ) : null}
        {activeSection === "overview" ? (
          <div className="vendor-dashboard-tab vendor-reference-overview">
            <div className="vendor-dashboard-header">
              <div>
                <h3 className="vendor-dashboard-header-title">Overview</h3>
              </div>
            </div>
            <div className="vendor-reference-stat-grid">
              {metrics.map((metric) => (
                <article key={metric.label} className="vendor-reference-stat-card">
                  <div className="vendor-reference-stat-copy">
                    <span className="vendor-reference-stat-meta">{metric.meta}</span>
                    <h3>{metric.label}</h3>
                    <strong>{metric.value}</strong>
                  </div>
                  <div className={`vendor-reference-stat-icon ${metric.accent}`}>
                    {metric.accent === "clients" ? <UserRound size={20} /> : null}
                    {metric.accent === "completed" ? <Sparkles size={20} /> : null}
                    {metric.accent === "cancelled" ? <CalendarDays size={20} /> : null}
                  </div>
                </article>
              ))}
            </div>

            <div className="vendor-reference-overview-grid">
              <section className="vendor-reference-panel vendor-reference-calendar-panel">
                <div className="vendor-reference-panel-head">
                  <div>
                    <h2>{calendarData.label}</h2>
                  </div>
                  <div className="vendor-reference-calendar-actions">
                    <button
                      type="button"
                      className="vendor-reference-icon-button"
                      aria-label="Previous month"
                      onClick={() =>
                        setCalendarCursor(
                          (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1)
                        )
                      }
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      className="vendor-reference-icon-button"
                      aria-label="Next month"
                      onClick={() =>
                        setCalendarCursor(
                          (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1)
                        )
                      }
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                <div className="vendor-reference-calendar">
                  <div className="vendor-reference-calendar-weekdays">
                    {CALENDAR_WEEKDAYS.map((day) => (
                      <span key={day}>{day}</span>
                    ))}
                  </div>

                  <div className="vendor-reference-calendar-grid">
                    {calendarData.weeks.flat().map((day) => (
                      <div
                        key={day.dateKey}
                        className={`vendor-reference-calendar-cell ${day.currentMonth ? "" : "outside"} ${day.tone ? `is-${day.tone}` : ""} ${day.isToday ? "is-today" : ""}`.trim()}
                      >
                        <span>{day.dayLabel}</span>
                        {day.count ? <small>{day.count}</small> : null}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="vendor-reference-calendar-legend">
                  <span><i className="pending" /> Pending</span>
                  <span><i className="booked" /> Booking</span>
                  <span><i className="completed" /> Completed</span>
                </div>
              </section>

              <section className="vendor-reference-panel vendor-reference-lineup-panel">
                <div className="vendor-reference-panel-head">
                  <div>
                    <h2>Daily lineup</h2>
                  </div>
                  <button type="button" className="vendor-reference-view-link" onClick={() => handleSectionSelect("bookings")}>
                    View All
                  </button>
                </div>

                <div className="vendor-reference-lineup-list">
                  {lineupBookings.length ? (
                    lineupBookings.map((booking) => {
                      const [backgroundColor, color] = getAvatarSwatch(
                        booking.customerEmail || booking.customerName
                      );

                      return (
                        <div key={booking.id} className="vendor-reference-lineup-row">
                          <span
                            className="vendor-reference-lineup-avatar"
                            style={{ backgroundColor, color }}
                          >
                            {getInitials(booking.customerName)}
                          </span>
                          <div className="vendor-reference-lineup-copy">
                            <strong>{booking.customerName}</strong>
                            <small>{formatLineupDate(booking.appointmentDate)}</small>
                          </div>
                          <span className="vendor-reference-lineup-service">{booking.serviceName}</span>
                          <span className="vendor-reference-lineup-time">{booking.appointmentSlot}</span>
                          <div style={{ display: "flex", gap: "6px", alignItems: "center", marginLeft: "auto" }}>
                            {booking.status === "pending_approval" ? (
                              <>
                                <button
                                  type="button"
                                  disabled={loading.bookingAction === booking.id}
                                  onClick={() => performBookingAction(booking.id, { action: "approve" }, "Booking approved.")}
                                  style={{
                                    padding: "4px 10px",
                                    borderRadius: "6px",
                                    border: "none",
                                    background: "#16a34a",
                                    color: "#fff",
                                    fontSize: "0.72rem",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                  }}
                                >
                                  Accept
                                </button>
                                <button
                                  type="button"
                                  disabled={loading.bookingAction === booking.id}
                                  onClick={() => performBookingAction(booking.id, { action: "decline", reason: "" }, "Booking declined.")}
                                  style={{
                                    padding: "4px 10px",
                                    borderRadius: "6px",
                                    border: "1px solid #dc2626",
                                    background: "#fff",
                                    color: "#dc2626",
                                    fontSize: "0.72rem",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                  }}
                                >
                                  Reject
                                </button>
                              </>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => setBookingDetailModal(booking)}
                              style={{
                                padding: "4px 10px",
                                borderRadius: "6px",
                                border: "1px solid #e2e8f0",
                                background: "#fff",
                                color: "#475569",
                                fontSize: "0.72rem",
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              See details
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="vendor-reference-empty-state">
                      No client appointments are scheduled yet.
                    </div>
                  )}
                </div>
              </section>
            </div>


          </div>
        ) : null}

      {activeSection === "profile" ? (
        <div className="vendor-dashboard-tab vendor-profile-workspace">
          <div className="vendor-dashboard-header">
            <div>
              <h3 className="vendor-dashboard-header-title">Update storefront content</h3>
            </div>
            <SiteButton href={`/stylists/${dashboard.vendor.slug}`} variant="secondary">
              View live profile
            </SiteButton>
          </div>

          <div className="vendor-dashboard-tabs" role="tablist" aria-label="Profile sections">
            {PROFILE_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`vendor-dashboard-tab-item ${activeProfileTab === tab.id ? "active" : ""}`}
                onClick={() => handleProfileTabSelect(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeProfileTab === "personal" ? (
            <form className="vendor-profile-form vendor-dashboard-card" onSubmit={handleProfileSubmit}>
              <div className="vendor-profile-form-head">
                <h4>Personal Info</h4>
                <SiteButton disabled={loading.profile} size="sm" type="submit">
                  {loading.profile ? "Saving..." : "Save"}
                </SiteButton>
              </div>

              <div className="vendor-profile-field">
                <span>Profile Picture</span>
                <div className="vendor-avatar-upload-row">
                  <div className="vendor-avatar-preview">
                    {profileForm.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={profileForm.avatar} src={profileForm.avatar} alt="Profile" />
                    ) : (
                      <div className="vendor-avatar-fallback">
                        {getInitials(profileForm.personalInfo.displayName || profileForm.name || "Vendor")}
                      </div>
                    )}
                  </div>
                  <div className="vendor-avatar-actions">
                    <button
                      type="button"
                      className="vendor-reference-icon-button"
                      onClick={() => document.getElementById("vendor-avatar-input").click()}
                      disabled={loading.avatarUpload}
                      title="Upload profile photo"
                    >
                      {loading.avatarUpload ? (
                        <span className="vendor-avatar-spinner" />
                      ) : (
                        <Upload size={16} />
                      )}
                    </button>
                    {profileForm.avatar ? (
                      <button
                        type="button"
                        className="vendor-reference-icon-button"
                        onClick={() => setProfileForm((current) => ({ ...current, avatar: "" }))}
                        title="Remove profile photo"
                      >
                        <Trash2 size={16} />
                      </button>
                    ) : null}
                    <input
                      id="vendor-avatar-input"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) handleImageUpload("avatar", "avatars", file, "avatarUpload");
                        event.target.value = "";
                      }}
                    />
                  </div>
                </div>
                <small>Upload a portrait photo. This will be shown on your public stylist profile.</small>
              </div>

              <label className="vendor-profile-field">
                <span>My Display Name</span>
                
                <input
                  className="form-control"
                  value={profileForm.personalInfo.displayName}
                  onChange={(event) => updatePersonalInfo("displayName", event.target.value)}
                  autoComplete="name"
                />
                <small>Your preferred name or however you would like people to refer to you on Hair Force.</small>
              </label>

              <div className="vendor-profile-field">
                <span>My Pronouns <em>(Optional)</em></span>
                <small>
                  Selections: {profileForm.personalInfo.pronouns.length ? profileForm.personalInfo.pronouns.join(", ") : "none"}
                </small>
                <div className="vendor-pronoun-grid">
                  {PRONOUN_OPTIONS.flat().map((pronoun) => (
                    <label key={pronoun} className="vendor-check-row">
                      <input
                        type="checkbox"
                        checked={profileForm.personalInfo.pronouns.includes(pronoun)}
                        onChange={() => togglePronoun(pronoun)}
                      />
                      <span>{pronoun}</span>
                    </label>
                  ))}
                </div>
              </div>

              <label className="vendor-profile-field">
                <span>My Profession</span>
                <select
                  className="form-control"
                  value={profileForm.personalInfo.profession}
                  onChange={(event) => updatePersonalInfo("profession", event.target.value)}
                >
                  {PROFESSION_OPTIONS.map((profession) => (
                    <option key={profession} value={profession}>
                      {profession}
                    </option>
                  ))}
                </select>
              </label>

              <label className="vendor-profile-field">
                <span>My Specialty</span>
                <select
                  className="form-control vendor-multi-select"
                  multiple
                  size={Math.min(Math.max(services.length, 2), 6)}
                  value={selectedSpecialties}
                  onChange={updateSpecialtySelection}
                >
                  {services.length ? (
                    services.map((service) => (
                      <option key={service.id || service.title} value={service.title}>
                        {service.title}
                      </option>
                    ))
                  ) : (
                    <option value="">Add services first to choose specialties</option>
                  )}
                </select>
              </label>

              <label className="vendor-profile-field">
                <span>About Me</span>
                <textarea
                  className="form-control"
                  rows="9"
                  placeholder="About Me"
                  value={profileForm.personalInfo.about}
                  onChange={(event) => updatePersonalInfo("about", event.target.value)}
                />
              </label>

              <div className="vendor-profile-two">
                <label className="vendor-profile-field">
                  <span>Email</span>
                  <input
                    className="form-control"
                    type="email"
                    value={profileForm.personalInfo.email}
                    onChange={(event) => updatePersonalInfo("email", event.target.value)}
                    autoComplete="email"
                  />
                </label>
                <label className="vendor-profile-field">
                  <span>Phone Number</span>
                  <input
                    className="form-control"
                    type="tel"
                    value={profileForm.personalInfo.phone}
                    onChange={(event) => updatePersonalInfo("phone", event.target.value)}
                    autoComplete="tel"
                  />
                </label>
              </div>

              <label className="vendor-profile-field">
                <span>My Hair Force Website</span>
                <div className="vendor-url-field">
                  <span>hairforce.app /</span>
                  <input
                    value={profileForm.personalInfo.websitePath.replace(/^\/?stylists\//, "")}
                    onChange={(event) => updatePersonalInfo("websitePath", `/stylists/${event.target.value}`)}
                  />
                </div>
              </label>
            </form>
          ) : null}

          {activeProfileTab === "business" ? (
            <form className="vendor-profile-form vendor-dashboard-card" onSubmit={handleProfileSubmit}>
              <div className="vendor-profile-form-head">
                <h4>Edit Business Info</h4>
                <SiteButton disabled={loading.profile} size="sm" type="submit">
                  {loading.profile ? "Saving..." : "Save"}
                </SiteButton>
              </div>

              <label className="vendor-profile-field">
                <span>Business Name</span>
                <input
                  className="form-control"
                  placeholder="e.g. Calvin's Salon"
                  value={profileForm.businessInfo.businessName}
                  onChange={(event) => updateBusinessInfo("businessName", event.target.value)}
                  autoComplete="organization"
                />
              </label>

              <div className="vendor-profile-two">
                <label className="vendor-profile-field">
                  <span>Salon Number</span>
                  <input
                    className="form-control"
                    type="tel"
                    placeholder="___-___-____"
                    value={profileForm.businessInfo.salonNumber}
                    onChange={(event) => updateBusinessInfo("salonNumber", event.target.value)}
                    autoComplete="tel"
                  />
                </label>
                <label className="vendor-profile-field">
                  <span>Personal Phone Number</span>
                  <input
                    className="form-control"
                    type="tel"
                    value={profileForm.businessInfo.personalPhoneNumber}
                    onChange={(event) => updateBusinessInfo("personalPhoneNumber", event.target.value)}
                    autoComplete="tel"
                  />
                </label>
              </div>

              <div className="vendor-profile-field">
                <span>Number Shown on Profile</span>
                <label className="vendor-radio-row">
                  <input
                    type="radio"
                    checked={profileForm.businessInfo.numberShownOnProfile === "salonNumber"}
                    onChange={() => updateBusinessInfo("numberShownOnProfile", "salonNumber")}
                  />
                  <span>Salon Number</span>
                </label>
                <label className="vendor-radio-row">
                  <input
                    type="radio"
                    checked={profileForm.businessInfo.numberShownOnProfile === "personalPhoneNumber"}
                    onChange={() => updateBusinessInfo("numberShownOnProfile", "personalPhoneNumber")}
                  />
                  <span>Personal Phone Number</span>
                </label>
                {shownPhoneNumber ? <small>Visible phone: {shownPhoneNumber}</small> : null}
              </div>

              <label className="vendor-profile-field">
                <span>SMS Notifications Phone Number</span>
                <input
                  className="form-control"
                  type="tel"
                  value={profileForm.businessInfo.smsNotificationsPhoneNumber}
                  onChange={(event) => updateBusinessInfo("smsNotificationsPhoneNumber", event.target.value)}
                  autoComplete="tel"
                />
                <small>You can control SMS timing in text settings.</small>
              </label>

              <div className="vendor-business-location-head">
                <div>
                  <h4>Business Location</h4>
                  <strong>Mobile business</strong>
                  <small>Turn on if you travel to meet your clients</small>
                </div>
                <label className="vendor-toggle">
                  <input
                    type="checkbox"
                    checked={profileForm.businessInfo.mobileBusiness}
                    onChange={(event) => {
                      updateBusinessInfo("mobileBusiness", event.target.checked);
                      setProfileForm((current) => ({
                        ...current,
                        serviceLocationType: event.target.checked ? "mobile" : current.serviceLocationType || "studio"
                      }));
                    }}
                  />
                  <span />
                </label>
              </div>

              <label className="vendor-profile-field">
                <span>Street Address</span>
                <input
                  className="form-control"
                  placeholder="e.g. 111 South Ave"
                  value={profileForm.businessInfo.streetAddress}
                  onChange={(event) => updateBusinessInfo("streetAddress", event.target.value)}
                  autoComplete="street-address"
                />
              </label>
              <label className="vendor-profile-field">
                <span>Suite, Apt, etc. (optional)</span>
                <input
                  className="form-control"
                  placeholder="e.g. Suite 201"
                  value={profileForm.businessInfo.suite}
                  onChange={(event) => updateBusinessInfo("suite", event.target.value)}
                />
              </label>

              <div className="vendor-profile-three">
                <label className="vendor-profile-field">
                  <span>City</span>
                  <input
                    className="form-control"
                    placeholder="e.g. San Francisco"
                    value={profileForm.businessInfo.city}
                    onChange={(event) => updateBusinessInfo("city", event.target.value)}
                    autoComplete="address-level2"
                  />
                </label>
                <label className="vendor-profile-field">
                  <span>State</span>
                  <input
                    className="form-control"
                    placeholder="e.g. CA"
                    value={profileForm.businessInfo.state}
                    onChange={(event) => updateBusinessInfo("state", event.target.value)}
                    autoComplete="address-level1"
                  />
                </label>
                <label className="vendor-profile-field">
                  <span>Zip</span>
                  <input
                    className="form-control"
                    placeholder="e.g. 94104"
                    value={profileForm.businessInfo.zip}
                    onChange={(event) => updateBusinessInfo("zip", event.target.value)}
                    autoComplete="postal-code"
                  />
                </label>
              </div>

              <label className="vendor-profile-field">
                <span>Location Instructions</span>
                <textarea
                  className="form-control"
                  rows="6"
                  maxLength={500}
                  placeholder="e.g. Add details like landmarks, parking instructions, or any information that will help clients find your business"
                  value={profileForm.businessInfo.locationInstructions}
                  onChange={(event) => updateBusinessInfo("locationInstructions", event.target.value)}
                />
                <small>Max 500 characters. Instructions show after a client has booked with you.</small>
              </label>

              <div className="surface" style={{ padding: "16px 18px", display: "grid", gap: 10 }}>
                <strong>Discovery map pin</strong>
                <span className="muted tiny">
                  Save the address to refresh the public profile and discovery map location.
                </span>
                {dashboard.vendor.latitude !== null && dashboard.vendor.latitude !== undefined ? (
                  <span className="badge">
                    Saved pin: {dashboard.vendor.latitude}, {dashboard.vendor.longitude}
                  </span>
                ) : (
                  <span className="muted tiny">No saved map pin yet.</span>
                )}
              </div>
            </form>
          ) : null}

          {activeProfileTab === "social" ? (
            <form className="vendor-profile-form vendor-dashboard-card" onSubmit={handleProfileSubmit}>
              <div className="vendor-profile-form-head">
                <h4>Edit Social Media Info</h4>
                <SiteButton disabled={loading.profile} size="sm" type="submit">
                  {loading.profile ? "Saving..." : "Save"}
                </SiteButton>
              </div>

              <label className="vendor-profile-field">
                <span>Instagram Username</span>
                <input
                  className="form-control"
                  value={profileForm.socialLinks.instagram}
                  onChange={(event) => updateSocialLink("instagram", event.target.value)}
                  autoComplete="off"
                />
              </label>
              <label className="vendor-profile-field">
                <span>Facebook URL</span>
                <input
                  className="form-control"
                  type="url"
                  value={profileForm.socialLinks.facebook}
                  onChange={(event) => updateSocialLink("facebook", event.target.value)}
                />
              </label>
              <label className="vendor-profile-field">
                <span>Twitter Username</span>
                <input
                  className="form-control"
                  value={profileForm.socialLinks.twitter}
                  onChange={(event) => updateSocialLink("twitter", event.target.value)}
                />
              </label>
              <label className="vendor-profile-field">
                <span>Business Website</span>
                <input
                  className="form-control"
                  type="url"
                  value={profileForm.socialLinks.website}
                  onChange={(event) => updateSocialLink("website", event.target.value)}
                />
              </label>
              <label className="vendor-profile-field">
                <span>Yelp URL</span>
                <input
                  className="form-control"
                  type="url"
                  value={profileForm.socialLinks.yelp}
                  onChange={(event) => updateSocialLink("yelp", event.target.value)}
                />
              </label>
            </form>
          ) : null}

          

          {activeProfileTab === "products" ? (
            <div className="vendor-products-manager vendor-dashboard-card">
              <div className="vendor-profile-form-head">
                <div>
                  <h4>Product Menu</h4>
                  <p>Sell products to clients at the time of checkout.</p>
                </div>
                <button type="button" className="vendor-help-button" title="Product help">
                  <HelpCircle size={18} />
                </button>
              </div>

              {profileForm.products.length ? (
                <div className="vendor-product-list">
                  {profileForm.products.map((product) => (
                    <article key={product.id} className="vendor-product-card">
                      <Package size={22} />
                      <div>
                        <strong>{product.name}</strong>
                        <p>{product.category} · {formatCurrency(product.price || 0)}</p>
                        {product.description ? <span>{product.description}</span> : null}
                      </div>
                      <div className="vendor-product-actions">
                        <button type="button" onClick={() => openProductModal(product)}>
                          <Edit3 size={16} />
                          Edit
                        </button>
                        <button type="button" onClick={() => deleteProduct(product.id)}>
                          <Trash2 size={16} />
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="vendor-product-empty">
                  <h4>Add a product to get started</h4>
                  <p>Sell Products to clients at the time of checkout</p>
                  <SiteButton type="button" onClick={() => openProductModal()}>
                    <Plus size={18} />
                    Add A Product
                  </SiteButton>
                </div>
              )}

              {profileForm.products.length ? (
                <SiteButton type="button" onClick={() => openProductModal()}>
                  <Plus size={18} />
                  Add A Product
                </SiteButton>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {activeSection === "gallery" ? (
        <div className="vendor-dashboard-tab vendor-profile-workspace">
          <div className="vendor-dashboard-header">
            <div>
              <h3 className="vendor-dashboard-header-title">Manage Photos and Videos</h3>
            </div>
            <SiteButton href={`/stylists/${dashboard.vendor.slug}`} variant="secondary">
              View live profile
            </SiteButton>
          </div>

          <div className="vendor-gallery-manager vendor-dashboard-card">
            <div className="vendor-gallery-hero">
              <div>
                <h4>Gallery</h4>
                <p>Add photos and videos to highlight your work. Tag them to services so clients know what you specialize in.</p>

              </div>
              <label className="vendor-icon-action" title="Add to gallery">
                <Plus size={28} />
                <input type="file" multiple accept="image/*,video/mp4,video/quicktime" onChange={handlePortfolioUpload} />
              </label>
            </div>

            <label className="vendor-gallery-upload">
              <Upload size={24} />
              <strong>{loading.portfolioUpload ? "Uploading..." : "Add to your gallery"}</strong>
              <input type="file" multiple accept="image/*,video/mp4,video/quicktime" onChange={handlePortfolioUpload} />
            </label>

            <div className="vendor-gallery-section-head">
              <div>
                <h4>All Photos & Videos <span>({profileForm.portfolioItems.length})</span></h4>
                <p>Tap the plus icon to tag a service to your photos.</p>
              </div>
              <SiteButton
                type="button"
                size="sm"
                disabled={loading.profile}
                onClick={() => saveProfileChanges(profileForm, "Gallery saved.")}
              >
                {loading.profile ? "Saving..." : "Save Gallery"}
              </SiteButton>
            </div>

            <div className="vendor-gallery-grid">
              {profileForm.portfolioItems.length ? (
                profileForm.portfolioItems.map((item) => (
                  <article key={item.id} className="vendor-gallery-card">
                    <div className="vendor-gallery-card-actions">
                      <button
                        type="button"
                        className={`vendor-tiny-icon ${item.pinned ? "active" : ""}`}
                        title={item.pinned ? "Unpin media" : "Pin media"}
                        onClick={() =>
                          setProfileForm((current) => ({
                            ...current,
                            portfolioItems: current.portfolioItems.map((entry) =>
                              entry.id === item.id ? { ...entry, pinned: !entry.pinned } : entry
                            )
                          }))
                        }
                      >
                        <Plus size={13} />
                      </button>
                      <button
                        type="button"
                        className="vendor-tiny-icon"
                        title="Edit media"
                        onClick={() => openMediaEditor(item)}
                      >
                        <Edit3 size={13} />
                      </button>
                    </div>
                    {item.type === "video" ? (
                      <video src={item.url} className="vendor-gallery-media" controls />
                    ) : (
                      <img src={item.url} alt={item.caption || "Gallery media"} className="vendor-gallery-media" />
                    )}
                    <button type="button" className="vendor-tag-service-button" onClick={() => openMediaEditor(item)}>
                      <Plus size={16} />
                      {item.serviceId ? "Edit Service Tag" : "Tag Service"}
                    </button>
                  </article>
                ))
              ) : (
                <div className="vendor-gallery-empty">
                  <ImageIcon size={26} />
                  <strong>No gallery media yet</strong>
                  <span>Upload work samples to feature them on the public profile.</span>
                </div>
              )}
            </div>

            <div className="vendor-gallery-tips">
              <h4>Tips for taking great photos!</h4>
              {[
                ["Keep your background clean and simple", "Use a plain wall or tidy station so your work stands out, not what's behind it."],
                ["Keep your framing consistent", "Use the same angle and setup for each clip so your feed feels cohesive and professional."],
                ["Shoot near natural light", "Face a window or doorway for the best light. Avoid overhead fixtures that wash out color and texture."]
              ].map(([title, copy]) => (
                <div key={title} className="vendor-tip-card">
                  <Info size={18} />
                  <div>
                    <strong>{title}</strong>
                    <p>{copy}</p>
                  </div>
                </div>
              ))}

              <h4>Simple videos that will bring your portfolio to life.</h4>
              {[
                ["Show the before and after", "Capture the before, spin the chair, then reveal the after."],
                ["Film short clips of your process", "This builds client trust and highlights your technique."],
                ["Show your finished looks in action", "Hair that moves, makeup that catches the light, nails from every angle."]
              ].map(([title, copy]) => (
                <div key={title} className="vendor-tip-card">
                  <Info size={18} />
                  <div>
                    <strong>{title}</strong>
                    <p>{copy}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {activeSection === "services" ? (
        <div className="vendor-dashboard-tab vendor-services-page">
          <div className="vendor-dashboard-header">
            <div>
              <h3 className="vendor-dashboard-header-title">Services &amp; Add-ons</h3>
            </div>
            <SiteButton
              type="button"
              size="sm"
              onClick={serviceMenuTab === "addons" ? () => openAddonEditor() : openAddChooser}
            >
              <Plus size={18} />
              {serviceMenuTab === "addons" ? "Create Add-On" : "Add"}
            </SiteButton>
          </div>

          <div className="vendor-dashboard-tabs" role="tablist" aria-label="Services and add-ons">
            {SERVICE_MENU_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`vendor-dashboard-tab-item ${serviceMenuTab === tab.id ? "active" : ""}`}
                onClick={() => setServiceMenuTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {serviceMenuTab === "services" ? (
            <div className="vendor-service-menu-list vendor-dashboard-card">
              {serviceSections.map((section) => (
                <section
                  key={section.id || "default"}
                  className={`vendor-service-category ${section.id ? "has-category" : ""}`}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => handleServiceDrop(event, section.id)}
                >
                  <div className="vendor-service-category-title">
                    <h3>{section.title}</h3>
                    {section.id ? (
                      <button
                        type="button"
                        onClick={() =>
                          startEditingService(
                            serviceCategories.find(
                              (item) => String(item.id || item._id || item.title) === String(section.id)
                            )
                          )
                        }
                        aria-label={`Edit ${section.title}`}
                      >
                        <Edit3 size={16} />
                      </button>
                    ) : null}
                  </div>

                  {section.services.length ? (
                    section.services.map((service) => (
                      <article
                        key={service.id || service._id}
                        className="vendor-service-row"
                        draggable
                        onDragStart={(event) => event.dataTransfer.setData("text/plain", service.id || service._id)}
                      >
                        <GripVertical size={24} />
                        <button type="button" onClick={() => startEditingService(service)}>
                          <strong>{service.title}</strong>
                          <span>
                            {formatCurrency(service.price || 0)}
                            {service.metadata?.priceIsStartingAt ? " and up" : ""} for {formatDurationLabel(service.duration)}
                          </span>
                          {getServiceType(service) === "combined" ? <em>Combined service</em> : null}
                        </button>
                        <ChevronRight size={30} />
                      </article>
                    ))
                  ) : (
                    <div className="vendor-service-drop-empty">
                      Drop a service here or use Add to create one in this category.
                    </div>
                  )}
                </section>
              ))}

              {!bookableServices.length && !serviceCategories.length ? (
                <div className="vendor-service-empty-state">
                  <Scissors size={34} />
                  <h3>Add your first service</h3>
                  <p>Choose from the service catalog, then set price, duration, deposit, and description.</p>
                  <SiteButton type="button" onClick={openAddChooser}>
                    <Plus size={18} />
                    Add Service
                  </SiteButton>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="vendor-addon-tab vendor-dashboard-card">
              <div className="vendor-addon-info">
                <Info size={24} />
                <div>
                  <strong>Add-ons just got easier</strong>
                  <p>Clients can view add-ons after selecting a service.</p>
                </div>
              </div>

              {addOns.length ? (
                <div className="vendor-addon-list">
                  {addOns.map((addon) => (
                    <article key={addon.id || addon._id} className="vendor-addon-row">
                      <div>
                        <strong>{addon.title}</strong>
                        <span>
                          +{formatCurrency(addon.price || 0)} - {formatDurationLabel(addon.duration)} - {addon.metadata?.timeAdded === "before" ? "Before base service" : "After base service"}
                        </span>
                        {addon.description ? <p>{addon.description}</p> : null}
                      </div>
                      <div className="vendor-addon-actions">
                        <button type="button" onClick={() => openAddonEditor(addon)}>
                          <Edit3 size={16} />
                          Edit
                        </button>
                        <button type="button" onClick={() => handleDeleteService(addon.id || addon._id)}>
                          <Trash2 size={16} />
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="vendor-service-empty-state compact">
                  <Layers2 size={34} />
                  <h3>No add-ons yet</h3>
                  <p>Add optional extras clients can pair with a base service.</p>
                  <SiteButton type="button" onClick={() => openAddonEditor()}>
                    <Plus size={18} />
                    Create Add-On
                  </SiteButton>
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}

      {false && activeSection === "services" ? (
        <div className="dashboard-layout" style={{ marginTop: 18 }}>
          <div className="dashboard-card">
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

      {serviceModal.view === "chooser" ? (
        <AddServiceModal
          isOpen
          onClose={() => setServiceModal({ view: "", mode: "create" })}
          initialServices={bookableServices}
          initialAddOns={addOns}
          initialCategories={serviceCategories}
          onSaveService={async (payload, isEdit) => {
            await saveServiceForm(
              {
                serviceType: "service",
                title: payload.title,
                duration: payload.duration,
                price: String(payload.price ?? ""),
                description: payload.description || "",
                parentCategoryId: payload.parentCategoryId || "",
                depositType: "percentage",
                depositValue: 0,
                imageUrl: "",
                featured: false,
                bookingMethod: "instant",
                isActive: true,
                includedServiceIds: [],
                sortOrder: 0,
                metadata: { priceIsStartingAt: true, timeAdded: "after", limitedDays: false, requireDeposit: false }
              },
              isEdit ? payload.id : ""
            );
          }}
          onSaveAddon={async (payload, isEdit) => {
            await saveServiceForm(
              {
                serviceType: "addon",
                title: payload.title,
                duration: payload.duration || "30 Minutes",
                price: String(payload.price ?? ""),
                description: payload.description || "",
                parentCategoryId: "",
                depositType: "percentage",
                depositValue: 0,
                imageUrl: "",
                featured: false,
                bookingMethod: "instant",
                isActive: true,
                includedServiceIds: [],
                sortOrder: 0,
                metadata: payload.metadata || { timeAdded: "after", limitedDays: false, requireDeposit: false }
              },
              isEdit ? payload.id : ""
            );
          }}
          onSaveCategory={async (payload, isEdit) => {
            await saveServiceForm(
              {
                serviceType: "category",
                title: payload.title,
                duration: "",
                price: "0",
                description: payload.description || "",
                parentCategoryId: "",
                depositType: "percentage",
                depositValue: 0,
                imageUrl: "",
                featured: false,
                bookingMethod: "instant",
                isActive: true,
                includedServiceIds: [],
                sortOrder: 0,
                metadata: {}
              },
              isEdit ? payload.id : ""
            );
          }}
          onDelete={(id) => handleDeleteService(id)}
        />
      ) : serviceModal.view ? (
        <div className="vendor-service-modal-backdrop" onClick={() => setServiceModal({ view: "", mode: "create" })}>
          <div
            className="vendor-service-modal"
            onClick={(event) => event.stopPropagation()}
          >
            {serviceModal.view === "catalog" ? (
              <>
                <div className="vendor-service-catalog-head">
                  <button type="button" onClick={() => setServiceModal({ view: "chooser", mode: "create" })}>Cancel</button>
                  <h3>Add Services</h3>
                  <button type="button" disabled>Save</button>
                </div>
                <label className="vendor-service-search">
                  <Search size={24} />
                  <input
                    value={serviceSearch}
                    onChange={(event) => setServiceSearch(event.target.value)}
                    placeholder="Search for a service..."
                  />
                </label>
                <div className="vendor-service-catalog-list">
                  <h4>Select a Service</h4>
                  {filteredServiceCatalog.map((group) => (
                    <div key={group.name} className="vendor-service-catalog-group">
                      <button
                        type="button"
                        className="vendor-service-catalog-group-title"
                        onClick={() =>
                          setExpandedCatalogGroups((current) => {
                            const next = new Set(current);
                            if (next.has(group.name)) {
                              next.delete(group.name);
                            } else {
                              next.add(group.name);
                            }
                            return next;
                          })
                        }
                      >
                        <strong>{group.name}</strong>
                        <ChevronLeft
                          size={22}
                          style={{
                            transform: expandedCatalogGroups.has(group.name) ? "rotate(-90deg)" : "rotate(-180deg)",
                            transition: "transform 0.2s ease"
                          }}
                        />
                      </button>
                      {expandedCatalogGroups.has(group.name)
                        ? group.items.map((item) => (
                            <button
                              key={`${group.name}-${item}`}
                              type="button"
                              className="vendor-service-catalog-item"
                              onClick={() => openServiceEditor({ title: item, metadata: { priceIsStartingAt: true } })}
                            >
                              <span>{item}</span>
                              <Plus size={24} />
                            </button>
                          ))
                        : null}
                    </div>
                  ))}
                </div>
              </>
            ) : null}

            {serviceModal.view === "combinedSelector" ? (
              <>
                <div className="vendor-service-modal-title">
                  <button type="button" onClick={() => setServiceModal({ view: "chooser", mode: "create" })} aria-label="Back to add menu">
                    <ChevronLeft size={30} />
                  </button>
                  <h3>Combined Service</h3>
                  <button type="button" onClick={() => setServiceModal({ view: "", mode: "create" })} aria-label="Close combined service">
                    <X size={28} />
                  </button>
                </div>
                <div className="vendor-combined-list">
                  {bookableServices.length ? (
                    bookableServices.map((service) => {
                      const serviceId = String(service.id || service._id);
                      return (
                        <button
                          key={serviceId}
                          type="button"
                          className={combinedSelection.includes(serviceId) ? "active" : ""}
                          onClick={() => toggleCombinedService(serviceId)}
                        >
                          <span>
                            <strong>{service.title}</strong>
                            <em>{formatCurrency(service.price || 0)} - {formatDurationLabel(service.duration)}</em>
                          </span>
                          {combinedSelection.includes(serviceId) ? <Check size={22} /> : <Plus size={22} />}
                        </button>
                      );
                    })
                  ) : (
                    <p className="muted">Add at least one service before creating a combined service.</p>
                  )}
                </div>
                <SiteButton type="button" disabled={!combinedSelection.length} fullWidth onClick={continueCombinedService}>
                  Continue
                </SiteButton>
              </>
            ) : null}

            {serviceModal.view === "serviceEditor" ? (
              <form
                className="vendor-service-editor"
                onSubmit={(event) => {
                  event.preventDefault();
                  saveServiceForm({
                    ...serviceForm,
                    includedServiceIds: serviceForm.serviceType === "combined" ? combinedSelection : []
                  });
                }}
              >
                <div className="vendor-service-editor-head">
                  <h3>{serviceForm.serviceType === "combined" ? "Add a Combined Service" : "Add a Service"}</h3>
                  <button type="button" onClick={() => setServiceModal({ view: "", mode: "create" })} aria-label="Close service form">
                    <X size={28} />
                  </button>
                </div>

                <label className="vendor-profile-field">
                  <span>Service Name</span>
                  <input className="form-control" value={serviceForm.title} onChange={(event) => setServiceForm({ ...serviceForm, title: event.target.value })} required />
                </label>
                <div className="vendor-service-price-row">
                  <label className="vendor-profile-field">
                    <span>Price</span>
                    <input className="form-control" type="number" min="0" step="0.01" value={serviceForm.price} onChange={(event) => setServiceForm({ ...serviceForm, price: event.target.value })} required />
                  </label>
                  <label className="vendor-switch-line">
                    <span className="vendor-toggle">
                      <input
                        type="checkbox"
                        checked={Boolean(serviceForm.metadata?.priceIsStartingAt)}
                        onChange={(event) => setServiceForm((current) => ({ ...current, metadata: { ...current.metadata, priceIsStartingAt: event.target.checked } }))}
                      />
                      <span />
                    </span>
                    And Up
                  </label>
                </div>
                <label className="vendor-profile-field">
                  <span>Duration</span>
                  <select className="form-control" value={serviceForm.duration} onChange={(event) => setServiceForm({ ...serviceForm, duration: event.target.value })}>
                    {DURATION_OPTIONS.map((duration) => (
                      <option key={duration} value={duration}>{duration}</option>
                    ))}
                  </select>
                </label>
                <label className="vendor-profile-field">
                  <span>Category</span>
                  <select className="form-control" value={serviceForm.parentCategoryId} onChange={(event) => setServiceForm({ ...serviceForm, parentCategoryId: event.target.value })}>
                    <option value="">Default</option>
                    {serviceCategories.map((category) => (
                      <option key={category.id || category._id || category.title} value={category.id || category._id || category.title}>
                        {category.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="vendor-switch-line">
                  <span>Require Deposit</span>
                  <span className="vendor-toggle">
                    <input
                      type="checkbox"
                      checked={Boolean(serviceForm.metadata?.requireDeposit)}
                      onChange={(event) => setServiceForm((current) => ({ ...current, metadata: { ...current.metadata, requireDeposit: event.target.checked } }))}
                    />
                    <span />
                  </span>
                </label>
                {serviceForm.metadata?.requireDeposit ? (
                  <label className="vendor-profile-field">
                    <span>Deposit Percentage</span>
                    <input className="form-control" type="number" min="0" max="100" value={serviceForm.depositValue} onChange={(event) => setServiceForm({ ...serviceForm, depositValue: event.target.value })} />
                  </label>
                ) : null}
                <label className="vendor-switch-line">
                  <span>This Service Is Only Available On Certain Days</span>
                  <span className="vendor-toggle">
                    <input
                      type="checkbox"
                      checked={Boolean(serviceForm.metadata?.limitedDays)}
                      onChange={(event) => setServiceForm((current) => ({ ...current, metadata: { ...current.metadata, limitedDays: event.target.checked } }))}
                    />
                    <span />
                  </span>
                </label>
                <label className="vendor-profile-field">
                  <span>Description</span>
                  <textarea className="form-control" rows="6" value={serviceForm.description} onChange={(event) => setServiceForm({ ...serviceForm, description: event.target.value })} placeholder="Type Here..." />
                  <small>Let clients know how to prepare, what to bring, and what this service entails.</small>
                </label>
                <div className="vendor-service-active-row">
                  <label className="vendor-check-row">
                    <input type="checkbox" checked={serviceForm.featured} onChange={(event) => setServiceForm({ ...serviceForm, featured: event.target.checked })} />
                    Featured on public profile
                  </label>
                  <label className="vendor-check-row">
                    <input type="checkbox" checked={serviceForm.isActive} onChange={(event) => setServiceForm({ ...serviceForm, isActive: event.target.checked })} />
                    Visible
                  </label>
                </div>
                <SiteButton disabled={loading.service} fullWidth type="submit">
                  {loading.service ? "Saving..." : "Save"}
                </SiteButton>
              </form>
            ) : null}

            {serviceModal.view === "addonEditor" ? (
              <form className="vendor-service-editor" onSubmit={handleServiceSubmit}>
                <div className="vendor-service-editor-head">
                  <button type="button" onClick={() => setServiceModal({ view: serviceMenuTab === "addons" ? "" : "chooser", mode: "create" })} aria-label="Back">
                    <ChevronLeft size={30} />
                  </button>
                  <h3>New Add-On</h3>
                  <span />
                </div>
                <label className="vendor-profile-field">
                  <span>Add-On Name</span>
                  <input className="form-control" placeholder="Ex: Bundles" value={serviceForm.title} onChange={(event) => setServiceForm({ ...serviceForm, title: event.target.value })} required />
                </label>
                <label className="vendor-profile-field">
                  <span>Additional Price</span>
                  <input className="form-control" type="number" min="0" step="0.01" value={serviceForm.price} onChange={(event) => setServiceForm({ ...serviceForm, price: event.target.value })} required />
                </label>
                <label className="vendor-profile-field">
                  <span>Additional Duration</span>
                  <select className="form-control" value={serviceForm.duration} onChange={(event) => setServiceForm({ ...serviceForm, duration: event.target.value })}>
                    {DURATION_OPTIONS.map((duration) => (
                      <option key={duration} value={duration}>{duration}</option>
                    ))}
                  </select>
                </label>
                <label className="vendor-profile-field">
                  <span>Time is Added</span>
                  <select
                    className="form-control"
                    value={serviceForm.metadata?.timeAdded || "after"}
                    onChange={(event) => setServiceForm((current) => ({ ...current, metadata: { ...current.metadata, timeAdded: event.target.value } }))}
                  >
                    <option value="after">After base service</option>
                    <option value="before">Before base service</option>
                  </select>
                </label>
                <label className="vendor-profile-field">
                  <span>Description</span>
                  <textarea className="form-control" rows="6" placeholder="Type Here..." value={serviceForm.description} onChange={(event) => setServiceForm({ ...serviceForm, description: event.target.value })} />
                </label>
                <label className="vendor-switch-line">
                  <span>This Add-On Is Only Available On Certain Days</span>
                  <span className="vendor-toggle">
                    <input
                      type="checkbox"
                      checked={Boolean(serviceForm.metadata?.limitedDays)}
                      onChange={(event) => setServiceForm((current) => ({ ...current, metadata: { ...current.metadata, limitedDays: event.target.checked } }))}
                    />
                    <span />
                  </span>
                </label>
                <label className="vendor-switch-line">
                  <span>Require Deposit</span>
                  <span className="vendor-toggle">
                    <input
                      type="checkbox"
                      checked={Boolean(serviceForm.metadata?.requireDeposit)}
                      onChange={(event) => setServiceForm((current) => ({ ...current, metadata: { ...current.metadata, requireDeposit: event.target.checked } }))}
                    />
                    <span />
                  </span>
                </label>
                <SiteButton disabled={loading.service} fullWidth type="submit">
                  {loading.service ? "Saving..." : "Save"}
                </SiteButton>
              </form>
            ) : null}

            {serviceModal.view === "categoryEditor" ? (
              <form className="vendor-service-editor compact" onSubmit={handleServiceSubmit}>
                <div className="vendor-service-editor-head">
                  <h3>{editingServiceId ? "Edit Category" : "New Category"}</h3>
                  <button type="button" onClick={() => setServiceModal({ view: "", mode: "create" })} aria-label="Close category form">
                    <X size={28} />
                  </button>
                </div>
                <label className="vendor-profile-field">
                  <span>Category Name</span>
                  <input className="form-control" placeholder="Ex: Natural Hair" value={serviceForm.title} onChange={(event) => setServiceForm({ ...serviceForm, title: event.target.value })} required />
                </label>
                <SiteButton disabled={loading.service} fullWidth type="submit">
                  {loading.service ? "Saving..." : "Save"}
                </SiteButton>
              </form>
            ) : null}
          </div>
        </div>
      ) : null}

      {activeSection === "availability" ? (
        <VendorAvailabilityAgenda
          availabilityForm={availabilityForm}
          blackoutDatesText={blackoutDatesText}
          dashboard={dashboard}
          user={user}
          onDashboardResponse={refreshFromResponse}
          onStatusChange={setStatus}
          setAvailabilityForm={setAvailabilityForm}
          onViewBookingDetails={setBookingDetailModal}
        />
      ) : null}

      {activeSection === "bookings" ? (
        <div className="vendor-dashboard-tab vendor-dashboard-bookings">
          <div className="vendor-dashboard-header">
            <div>
              <h3 className="vendor-dashboard-header-title">Booking list</h3>
            </div>
          </div>

          <section className="vendor-reference-panel vendor-reference-bookings-panel vendor-dashboard-card">
            <div className="vendor-reference-panel-head vendor-reference-panel-head-wrap">
              <div className="vendor-dashboard-tabs">
                {OVERVIEW_BOOKING_FILTERS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`vendor-dashboard-tab-item ${overviewBookingFilter === option.id ? "active" : ""}`}
                    onClick={() => setOverviewBookingFilter(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="vendor-reference-table-wrap">
              <table className="vendor-reference-table">
                <thead>
                  <tr>
                    <th>Customer Name</th>
                    <th>Order no</th>
                    <th>Service</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Status</th>
                    <th>Amount</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {overviewBookings.length ? (
                    overviewBookings.map((booking) => {
                      const [backgroundColor, color] = getAvatarSwatch(
                        booking.customerEmail || booking.customerName
                      );

                      return (
                        <tr key={booking.id}>
                          <td>
                            <div className="vendor-reference-customer-cell">
                              <span
                                className="vendor-reference-table-avatar"
                                style={{ backgroundColor, color }}
                              >
                                {getInitials(booking.customerName)}
                              </span>
                              <span>{booking.customerName}</span>
                            </div>
                          </td>
                          <td>#{String(booking.id || "").replace(/[^\d]/g, "").slice(-5) || "00001"}</td>
                          <td>{booking.serviceName}</td>
                          <td>{formatLineupDate(booking.appointmentDate)}</td>
                          <td>{booking.appointmentSlot}</td>
                          <td>
                            <span className={`vendor-reference-status-pill ${bookingStatusTone(booking.status)}`}>
                              {booking.status === "pending_approval"
                                ? "Pending"
                                : booking.status === "confirmed"
                                  ? "Confirmed"
                                  : booking.status === "completed"
                                    ? "Completed"
                                    : booking.status}
                            </span>
                          </td>
                          <td>{formatCurrency(booking.total)}</td>
                          <td>
                            <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                              {booking.status === "pending_approval" ? (
                                <>
                                  <button
                                    type="button"
                                    disabled={loading.bookingAction === booking.id}
                                    onClick={() =>
                                      performBookingAction(booking.id, { action: "approve" }, "Booking approved.")
                                    }
                                    style={{
                                      padding: "5px 12px",
                                      borderRadius: "8px",
                                      border: "none",
                                      background: "#16a34a",
                                      color: "#fff",
                                      fontSize: "0.78rem",
                                      fontWeight: 600,
                                      cursor: "pointer",
                                      opacity: loading.bookingAction === booking.id ? 0.6 : 1,
                                    }}
                                  >
                                    {loading.bookingAction === booking.id ? "…" : "Accept"}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={loading.bookingAction === booking.id}
                                    onClick={() =>
                                      performBookingAction(booking.id, { action: "decline", reason: "" }, "Booking declined.")
                                    }
                                    style={{
                                      padding: "5px 12px",
                                      borderRadius: "8px",
                                      border: "1px solid #dc2626",
                                      background: "#fff",
                                      color: "#dc2626",
                                      fontSize: "0.78rem",
                                      fontWeight: 600,
                                      cursor: "pointer",
                                      opacity: loading.bookingAction === booking.id ? 0.6 : 1,
                                    }}
                                  >
                                    {loading.bookingAction === booking.id ? "…" : "Reject"}
                                  </button>
                                </>
                              ) : null}
                              {(booking.status === "confirmed" || booking.status === "pending_approval") ? (
                                <button
                                  type="button"
                                  disabled={loading.bookingAction === booking.id}
                                  onClick={() =>
                                    performBookingAction(booking.id, { action: "cancel", reason: "" }, "Booking cancelled.")
                                  }
                                  style={{
                                    padding: "5px 12px",
                                    borderRadius: "8px",
                                    border: "1px solid #64748b",
                                    background: "#fff",
                                    color: "#64748b",
                                    fontSize: "0.78rem",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    opacity: loading.bookingAction === booking.id ? 0.6 : 1,
                                  }}
                                >
                                  {loading.bookingAction === booking.id ? "…" : "Cancel"}
                                </button>
                              ) : null}
                              <button
                                type="button"
                                className="vendor-reference-icon-button"
                                title="See details"
                                onClick={() => setBookingDetailModal(booking)}
                                style={{
                                  width: 28,
                                  height: 28,
                                  display: "grid",
                                  placeItems: "center",
                                  borderRadius: "6px",
                                  border: "1px solid #e2e8f0",
                                  background: "#fff",
                                  color: "#475569",
                                  cursor: "pointer",
                                }}
                              >
                                <Info size={14} />
                              </button>
                              <button
                                type="button"
                                className="vendor-reference-icon-button"
                                title="Message customer"
                                onClick={() => openConversationForBooking(booking.id)}
                                style={{
                                  width: 28,
                                  height: 28,
                                  display: "grid",
                                  placeItems: "center",
                                  borderRadius: "6px",
                                  border: "1px solid #e2e8f0",
                                  background: "#fff",
                                  color: "#475569",
                                  cursor: "pointer",
                                }}
                              >
                                <MessageSquareText size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="8">
                        <div className="vendor-reference-empty-state">No bookings in this view yet.</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}

      {activeSection === "messages" ? (
        <div className="vendor-dashboard-messages" style={{ marginTop: 18 }}>
          {/* Conversation List */}
          <div className="dashboard-card vendor-messenger-list">
            <div className="vendor-messenger-list-header">
              <h3>Chats</h3>
              <div className="vendor-messenger-list-actions">
                <button type="button" title="More options"><MoreHorizontal size={20} /></button>
              </div>
            </div>
            <div className="vendor-messenger-search">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search Messenger"
                value={conversationSearch}
                onChange={(e) => setConversationSearch(e.target.value)}
              />
            </div>
            <div className="vendor-messenger-conversations">
              {(() => {
                const term = conversationSearch.toLowerCase();
                const filtered = conversations.filter((c) => {
                  if (!term) return true;
                  return (
                    (c.customerName || "").toLowerCase().includes(term) ||
                    (c.serviceName || "").toLowerCase().includes(term)
                  );
                });
                // Deduplicate by clientId — keep the most recent conversation per client
                const seen = new Map();
                filtered.forEach((c) => {
                  const key = c.clientId || c.id;
                  const existing = seen.get(key);
                  if (!existing) {
                    seen.set(key, c);
                  } else if ((c.lastMessageAt || c.createdAt) > (existing.lastMessageAt || existing.createdAt)) {
                    seen.set(key, c);
                  }
                });
                const uniqueConversations = Array.from(seen.values());

                if (!uniqueConversations.length) {
                  return (
                    <div className="vendor-messenger-empty">
                      <p>No conversations found.</p>
                    </div>
                  );
                }

                return uniqueConversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    className={`vendor-messenger-chat-item ${activeConversationId === conversation.id ? "active" : ""}`}
                    onClick={() => setActiveConversationId(conversation.id)}
                  >
                    <div className="vendor-messenger-chat-avatar">
                      {getInitials(conversation.customerName)}
                    </div>
                    <div className="vendor-messenger-chat-info">
                      <div className="vendor-messenger-chat-top">
                        <strong>{conversation.customerName || "Client"}</strong>
                        <span className="vendor-messenger-chat-time">
                          {conversation.lastMessageAt ? formatMessageTime(conversation.lastMessageAt) : ""}
                        </span>
                      </div>
                      <div className="vendor-messenger-chat-bottom">
                        <span className="vendor-messenger-chat-preview">
                          {conversation.lastMessagePreview || "No messages yet"}
                        </span>
                        {conversation.vendorUnreadCount ? (
                          <span className="vendor-messenger-unread-badge">{conversation.vendorUnreadCount}</span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                ));
              })()}
            </div>
          </div>

          {/* Thread */}
          <div className="dashboard-card vendor-messenger-thread">
            {activeConversation ? (
              <>
                <div className="vendor-messenger-thread-header">
                  <div className="vendor-messenger-thread-user">
                    <div className="vendor-messenger-thread-avatar">
                      {getInitials(activeConversation.customerName)}
                    </div>
                    <div>
                      <strong>{activeConversation.customerName || "Client"}</strong>
                      <p>{activeConversation.serviceName}{activeConversation.appointmentDate ? ` · ${formatDateLabel(activeConversation.appointmentDate)}` : ""}</p>
                    </div>
                  </div>
                  <div className="vendor-messenger-thread-actions">
                    <VendorStatusToggle vendorSlug={user?.vendorSlug} initialStatus={dashboard?.profile?.callStatus || "available"} />
                    <button
                      type="button"
                      title={connected ? "Call" : "Reconnecting to call server…"}
                      disabled={!connected}
                      onClick={handleCallClick}
                      style={{ opacity: connected ? 1 : 0.5, cursor: connected ? "pointer" : "not-allowed" }}
                    >
                      <Phone size={18} />
                    </button>
                    <button type="button" title="Info"><Info size={18} /></button>
                  </div>
                </div>

                <div className="vendor-messenger-messages">
                  {threadState.loading ? (
                    <p className="muted tiny" style={{ textAlign: "center", margin: "auto" }}>Loading conversation...</p>
                  ) : null}
                  {threadState.error ? (
                    <p className="muted tiny" style={{ textAlign: "center", margin: "auto", color: "#fca5a5" }}>{threadState.error}</p>
                  ) : null}
                  {!threadState.loading && activeConversation && threadState.messages.length ? (
                    (() => {
                      const rows = [];
                      let lastDate = null;
                      threadState.messages.forEach((message, index) => {
                        const showDate = !lastDate || !isSameDay(lastDate, message.createdAt);
                        if (showDate) {
                          rows.push(
                            <div key={`date-${index}`} className="vendor-messenger-date-divider">
                              <span>{formatMessageDate(message.createdAt)}</span>
                            </div>
                          );
                          lastDate = message.createdAt;
                        }
                        const isMine = message.senderRole === "vendor";
                        const media = parseMediaUrl(message.body);
                        rows.push(
                          <div key={message.id} className={`vendor-messenger-bubble-row ${isMine ? "mine" : ""}`}>
                            {!isMine ? (
                              <div className="vendor-messenger-bubble-avatar">
                                {getInitials(activeConversation.customerName)}
                              </div>
                            ) : null}
                            <div className={`vendor-messenger-bubble ${isMine ? "mine" : ""}`}>
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
                              <span className="vendor-messenger-bubble-time">{formatMessageTime(message.createdAt)}</span>
                            </div>
                          </div>
                        );
                      });
                      return rows;
                    })()
                  ) : !threadState.loading && activeConversation ? (
                    <div className="vendor-messenger-empty-thread">
                      <p>No messages yet. Send the first update.</p>
                    </div>
                  ) : (
                    <div className="vendor-messenger-empty-thread">
                      <p>Select a conversation to start messaging.</p>
                    </div>
                  )}
                </div>

                <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="vendor-messenger-input-bar">
                  <input
                    ref={(el) => { if (el && !window.vendorChatFileInput) window.vendorChatFileInput = el; }}
                    type="file"
                    accept="image/*,video/*"
                    style={{ display: "none" }}
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      try {
                        const url = await uploadAsset(file, "messages");
                        await sendMessage(url);
                      } catch (error) {
                        setThreadState((current) => ({ ...current, error: error.message }));
                      }
                      event.target.value = "";
                    }}
                  />
                  <div style={{ position: "relative" }}>
                    <button
                      type="button"
                      className="vendor-messenger-input-action"
                      title="Add attachment"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        window.vendorAttachmentPos = { left: rect.left, bottom: window.innerHeight - rect.top };
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
                          left: Math.max(8, (window.vendorAttachmentPos?.left || 0) - 80),
                          bottom: (window.vendorAttachmentPos?.bottom || 50) + 8,
                          top: "auto",
                          right: "auto"
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setShowAttachmentMenu(false);
                            window.vendorChatFileInput?.click();
                          }}
                        >
                          <ImageIcon size={18} /> Picture
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAttachmentMenu(false);
                            window.vendorChatFileInput?.click();
                          }}
                        >
                          <Video size={18} /> Video
                        </button>
                      </div>
                    ) : null}
                  </div>
                  <div className="vendor-messenger-input-wrap">
                    <input
                      type="text"
                      placeholder="Aa"
                      value={threadState.draft}
                      onChange={(event) => setThreadState((current) => ({ ...current, draft: event.target.value }))}
                      onKeyDown={(event) => {
                        if ((event.key === "Enter" || event.code === "Enter" || event.code === "NumpadEnter") && !event.shiftKey && !event.isComposing) {
                          event.preventDefault();
                          sendMessage();
                        }
                      }}
                    />
                    <div style={{ position: "relative" }}>
                      <button
                        type="button"
                        className="vendor-messenger-input-action"
                        title="Emoji"
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          window.vendorEmojiPos = { right: window.innerWidth - rect.right, bottom: window.innerHeight - rect.top };
                          setShowEmojiPicker((s) => !s);
                        }}
                      >
                        <Smile size={20} />
                      </button>
                      {showEmojiPicker ? (
                        <div
                          style={{
                            position: "fixed",
                            bottom: (window.vendorEmojiPos?.bottom || 50) + 8,
                            right: Math.max(8, window.vendorEmojiPos?.right || 8),
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
                                setThreadState((current) => ({
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
                    className="vendor-messenger-send-btn"
                    disabled={threadState.sending || !threadState.draft.trim()}
                  >
                    <Send size={20} />
                  </button>
                </form>
              </>
            ) : (
              <div className="vendor-messenger-no-chat">
                <MessageSquareText size={48} style={{ opacity: 0.4 }} />
                <p>Select a conversation to start messaging</p>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {lightboxImage ? (
        <div className="chat-lightbox-overlay" onClick={() => setLightboxImage("")}>
          <button className="chat-lightbox-close" onClick={() => setLightboxImage("")}>
            <X size={20} />
          </button>
          <img src={lightboxImage} alt="Full size" onClick={(e) => e.stopPropagation()} />
        </div>
      ) : null}

      {activeSection === "settings" ? (
        <div className="vendor-settings-shell">
          <aside className="dashboard-card vendor-settings-nav vendor-dashboard-card" aria-label="Account settings tabs">
            <div>
              <h3 className="vendor-dashboard-header-title">Settings</h3>
            </div>
            <div className="vendor-settings-tab-list" role="tablist" aria-label="Vendor settings">
              {SETTINGS_TABS.map((tab) => {
                const Icon = tab.icon;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={activeSettingsTab === tab.id}
                    className={`vendor-settings-tab ${activeSettingsTab === tab.id ? "active" : ""}`}
                    onClick={() => handleSettingsTabSelect(tab.id)}
                  >
                    <Icon size={18} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="dashboard-card vendor-settings-panel vendor-dashboard-card">
            {activeSettingsTab === "notification" ? (
              <form onSubmit={handleNotificationSubmit} className="vendor-settings-form">
                <div className="vendor-settings-head vendor-dashboard-header" style={{ borderBottom: '1px solid #e5e5e5', borderRadius: 0, border: 'none', padding: '0 0 20px' }}>
                  <div>
                    <h3 className="vendor-dashboard-header-title">My Notifications</h3>
                    <p>You will receive updates about your account, client bookings, reschedules, and cancellations.</p>
                  </div>
                  <SiteButton type="submit" disabled={loading.notificationPreferences}>
                    {loading.notificationPreferences ? "Saving..." : "Save"}
                  </SiteButton>
                </div>

                <div className="vendor-settings-section">
                  <div>
                    <strong>Mobile Number</strong>
                    <p>{profileForm.businessInfo?.smsNotificationsPhoneNumber || user?.phone || "No mobile number on file"}</p>
                  </div>
                </div>

                <label className="vendor-settings-toggle-row">
                  <div>
                    <strong>Advice delivered to your phone</strong>
                    <p>Actionable insights, advice, and marketing texts designed to help achieve your business goals.</p>
                    <small>Recurring automated promotional and personalized marketing text messages may be sent to the number used when signing up.</small>
                  </div>
                  <span className="vendor-toggle" aria-label="Toggle advice texts">
                    <input
                      type="checkbox"
                      checked={notificationForm.marketingTexts}
                      onChange={() => toggleNotificationPreference("marketingTexts")}
                    />
                    <span />
                  </span>
                </label>

                <div className="vendor-settings-toggle-row vendor-settings-hours-row">
                  <div>
                    <strong>Send within specific hours only</strong>
                    <p>Keep SMS and push updates inside your preferred working window.</p>
                    <div className="vendor-settings-time-grid">
                      <label className="vendor-profile-field">
                        <span>From</span>
                        <select
                          className="form-control"
                          value={notificationForm.quietHoursFrom}
                          onChange={(event) =>
                            setNotificationForm((current) => ({ ...current, quietHoursFrom: event.target.value }))
                          }
                          disabled={!notificationForm.quietHoursEnabled}
                        >
                          {TIME_OPTIONS.map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="vendor-profile-field">
                        <span>To</span>
                        <select
                          className="form-control"
                          value={notificationForm.quietHoursTo}
                          onChange={(event) =>
                            setNotificationForm((current) => ({ ...current, quietHoursTo: event.target.value }))
                          }
                          disabled={!notificationForm.quietHoursEnabled}
                        >
                          {TIME_OPTIONS.map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>
                  <span className="vendor-toggle" aria-label="Toggle quiet hours">
                    <input
                      type="checkbox"
                      checked={notificationForm.quietHoursEnabled}
                      onChange={() => toggleNotificationPreference("quietHoursEnabled")}
                    />
                    <span />
                  </span>
                </div>

                <div className="vendor-settings-option-list">
                  {VENDOR_NOTIFICATION_OPTIONS.map((option) => (
                    <label key={option.key} className="vendor-settings-toggle-row">
                      <div>
                        <strong>{option.label}</strong>
                        <p>{option.description}</p>
                      </div>
                      <span className="vendor-toggle" aria-label={`Toggle ${option.label}`}>
                        <input
                          type="checkbox"
                          checked={notificationForm[option.key]}
                          onChange={() => toggleNotificationPreference(option.key)}
                        />
                        <span />
                      </span>
                    </label>
                  ))}
                </div>
              </form>
            ) : null}

            {activeSettingsTab === "billing" ? (
              <div className="vendor-settings-form">
                <div className="vendor-settings-head vendor-dashboard-header" style={{ borderBottom: '1px solid #e5e5e5', borderRadius: 0, border: 'none', padding: '0 0 20px' }}>
                  <div>
                    <h3 className="vendor-dashboard-header-title">Plan & Billing Details</h3>
                    <p>Manage your Premium Plan and the card used for monthly billing.</p>
                  </div>
                </div>

                <div className="vendor-plan-card">
                  <div className="vendor-plan-card-head">
                    <div>
                      <strong>{formatCurrency(billingPlan.priceMonthly || 35)}/mo</strong>
                      <h4>{billingPlan.name || "Premium Plan"}</h4>
                      <p>Your business, your way: advanced features, more flexibility, and lower fees.</p>
                    </div>
                    <span className="vendor-plan-badge">{billingPlan.status === "active" ? "Current Plan" : "Trial Plan"}</span>
                  </div>
                  <div className="vendor-plan-feature-list">
                    {(billingPlan.features || []).map((feature) => (
                      <span key={feature}>
                        <Check size={16} />
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="vendor-settings-section">
                  <div>
                    <strong>Payment Details</strong>
                    <p>
                      {billingPlan.status === "active"
                        ? `Your next bill is scheduled for ${formatBillingDate(billingPlan.nextBillingDate)}.`
                        : `Your trial subscription ends ${formatBillingDate(billingPlan.trialEndsAt)}.`}
                    </p>
                    <small>{paymentMethodLabel(defaultBillingMethod)}</small>
                  </div>
                  <SiteButton type="button" onClick={handleSubscribePlan} disabled={loading.subscribePlan}>
                    {loading.subscribePlan ? "Saving..." : defaultBillingMethod ? "Subscribe" : "Add card first"}
                  </SiteButton>
                </div>

                <div className="vendor-settings-payment-grid">
                  <div className="vendor-settings-section">
                    <strong>Saved payment methods</strong>
                    <div className="vendor-payment-method-list">
                      {billingPaymentMethods.length ? (
                        billingPaymentMethods.map((method) => (
                          <div key={method.id} className="vendor-payment-method-row">
                            <div>
                              <strong>{paymentMethodLabel(method)}</strong>
                              <p>Expires {String(method.expMonth).padStart(2, "0")}/{method.expYear}</p>
                            </div>
                            <div className="vendor-settings-actions">
                              {method.isDefault ? <span className="chip">Default</span> : null}
                              {!method.isDefault ? (
                                <button
                                  type="button"
                                  className="vendor-inline-link"
                                  onClick={() => handleSetDefaultPaymentMethod(method.id)}
                                  disabled={loading.paymentMethod === method.id}
                                >
                                  Set default
                                </button>
                              ) : null}
                              <button
                                type="button"
                                className="vendor-inline-link danger"
                                onClick={() => handleRemovePaymentMethod(method.id)}
                                disabled={loading.paymentMethod === method.id}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="muted tiny" style={{ margin: 0 }}>No Payment Method on File</p>
                      )}
                    </div>
                  </div>

                  <form onSubmit={handleAddPaymentMethod} className="vendor-settings-section vendor-payment-form">
                    <strong>Add Payment Method</strong>
                    <label className="vendor-profile-field">
                      <span>Cardholder name</span>
                      <input
                        className="form-control"
                        value={paymentMethodForm.holderName}
                        onChange={(event) => setPaymentMethodForm((current) => ({ ...current, holderName: event.target.value }))}
                        required
                      />
                    </label>
                    <div className="vendor-profile-two">
                      <label className="vendor-profile-field">
                        <span>Card brand</span>
                        <select
                          className="form-control"
                          value={paymentMethodForm.brand}
                          onChange={(event) => setPaymentMethodForm((current) => ({ ...current, brand: event.target.value }))}
                        >
                          <option>Visa</option>
                          <option>Mastercard</option>
                          <option>American Express</option>
                          <option>Discover</option>
                        </select>
                      </label>
                      <label className="vendor-profile-field">
                        <span>Last 4 digits</span>
                        <input
                          className="form-control"
                          inputMode="numeric"
                          maxLength="4"
                          value={paymentMethodForm.last4}
                          onChange={(event) => setPaymentMethodForm((current) => ({ ...current, last4: event.target.value.replace(/\D/g, "").slice(0, 4) }))}
                          required
                        />
                      </label>
                    </div>
                    <div className="vendor-profile-two">
                      <label className="vendor-profile-field">
                        <span>Expiry month</span>
                        <input
                          className="form-control"
                          type="number"
                          min="1"
                          max="12"
                          value={paymentMethodForm.expMonth}
                          onChange={(event) => setPaymentMethodForm((current) => ({ ...current, expMonth: event.target.value }))}
                          required
                        />
                      </label>
                      <label className="vendor-profile-field">
                        <span>Expiry year</span>
                        <input
                          className="form-control"
                          type="number"
                          min={new Date().getFullYear()}
                          value={paymentMethodForm.expYear}
                          onChange={(event) => setPaymentMethodForm((current) => ({ ...current, expYear: event.target.value }))}
                          required
                        />
                      </label>
                    </div>
                    <label className="vendor-check-row">
                      <input
                        type="checkbox"
                        checked={paymentMethodForm.isDefault}
                        onChange={(event) => setPaymentMethodForm((current) => ({ ...current, isDefault: event.target.checked }))}
                      />
                      Use as default billing card
                    </label>
                    <SiteButton type="submit" disabled={loading.addPaymentMethod}>
                      {loading.addPaymentMethod ? "Saving..." : "Add Payment Method"}
                    </SiteButton>
                  </form>
                </div>
              </div>
            ) : null}

            {activeSettingsTab === "email" ? (
              <div className="vendor-settings-form">
                <div className="vendor-settings-head vendor-dashboard-header" style={{ borderBottom: '1px solid #e5e5e5', borderRadius: 0, border: 'none', padding: '0 0 20px' }}>
                  <div>
                    <h3 className="vendor-dashboard-header-title">Change Email</h3>
                    <p>Email sign-in accounts can update the login email used for this stylist dashboard.</p>
                  </div>
                </div>
                {canUseEmailLogin ? (
                  <form onSubmit={handleEmailSubmit} className="vendor-settings-section">
                    <label className="vendor-profile-field">
                      <span>Email</span>
                      <input
                        className="form-control"
                        type="email"
                        value={emailForm.email}
                        onChange={(event) => setEmailForm({ email: event.target.value })}
                        autoComplete="email"
                        required
                      />
                    </label>
                    <SiteButton type="submit" disabled={loading.loginEmail}>
                      {loading.loginEmail ? "Saving..." : "Save"}
                    </SiteButton>
                  </form>
                ) : (
                  <div className="vendor-settings-empty">
                    <strong>Login email changes are not available</strong>
                    <p>This account signs in with {accountSecurity.authProvider === "apple" ? "Apple" : "Google"}, so the login email is managed by that provider.</p>
                  </div>
                )}
              </div>
            ) : null}

            {activeSettingsTab === "password" ? (
              <div className="vendor-settings-form">
                <div className="vendor-settings-head vendor-dashboard-header" style={{ borderBottom: '1px solid #e5e5e5', borderRadius: 0, border: 'none', padding: '0 0 20px' }}>
                  <div>
                    <h3 className="vendor-dashboard-header-title">Change Password</h3>
                    <p>Password changes are available for email sign-in accounts.</p>
                  </div>
                </div>
                {canUseEmailLogin ? (
                  <form onSubmit={handlePasswordSubmit} className="vendor-settings-section">
                    <label className="vendor-profile-field">
                      <span>Old Password</span>
                      <input
                        className="form-control"
                        type="password"
                        placeholder="Old Password"
                        value={passwordForm.currentPassword}
                        onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))}
                        autoComplete="current-password"
                        required
                      />
                    </label>
                    <label className="vendor-profile-field">
                      <span>New Password</span>
                      <input
                        className="form-control"
                        type="password"
                        placeholder="New Password"
                        value={passwordForm.password}
                        onChange={(event) => setPasswordForm((current) => ({ ...current, password: event.target.value }))}
                        autoComplete="new-password"
                        required
                      />
                    </label>
                    <label className="vendor-profile-field">
                      <span>Confirm Password</span>
                      <input
                        className="form-control"
                        type="password"
                        placeholder="Confirm Password"
                        value={passwordForm.confirmPassword}
                        onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                        autoComplete="new-password"
                        required
                      />
                    </label>

                    {passwordChangeMeta.step === "verify" ? (
                      <>
                        <label className="vendor-profile-field">
                          <span>Verification code</span>
                          <input
                            className="form-control"
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="6-digit code from email"
                            value={passwordForm.code || ""}
                            onChange={(event) => setPasswordForm((current) => ({ ...current, code: event.target.value.replace(/\D/g, "").slice(0, 6) }))}
                            autoComplete="one-time-code"
                            required
                          />
                          <small className="vendor-profile-field-hint">
                            Code sent to {passwordChangeMeta.email}
                          </small>
                        </label>
                        <div className="vendor-profile-field" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <SiteButton type="submit" disabled={loading.password}>
                            {loading.password ? "Saving..." : "Change password"}
                          </SiteButton>
                          <button
                            type="button"
                            className="auth-panel-link"
                            onClick={requestPasswordChangeCode}
                            disabled={loading.password || passwordChangeMeta.secondsLeft > 0}
                          >
                            {passwordChangeMeta.secondsLeft > 0
                              ? `Resend in ${passwordChangeMeta.secondsLeft}s`
                              : "Resend code"}
                          </button>
                        </div>
                      </>
                    ) : (
                      <SiteButton
                        type="button"
                        disabled={loading.password}
                        onClick={requestPasswordChangeCode}
                      >
                        {loading.password ? "Sending..." : "Send verification code"}
                      </SiteButton>
                    )}
                  </form>
                ) : (
                  <div className="vendor-settings-empty">
                    <strong>Password changes are not available</strong>
                    <p>This account signs in with {accountSecurity.authProvider === "apple" ? "Apple" : "Google"}, so password management stays with that provider.</p>
                  </div>
                )}
              </div>
            ) : null}

            {activeSettingsTab === "delete" ? (
              <div className="vendor-settings-form">
                <div className="vendor-settings-head vendor-dashboard-header" style={{ borderBottom: '1px solid #e5e5e5', borderRadius: 0, border: 'none', padding: '0 0 20px' }}>
                  <div>
                    <h3 className="vendor-dashboard-header-title">Delete stylist account</h3>
                    <p>Delete this stylist account only when you want this login to stop belonging to the vendor side.</p>
                  </div>
                </div>
                <div className="vendor-settings-danger">
                  <strong>Permanent account deletion</strong>
                  <p>This removes your vendor profile, services, bookings, conversations, saved billing methods, and notification settings.</p>
                  <SiteButton type="button" variant="secondary" onClick={handleDeleteAccount} disabled={loading.deleteAccount}>
                    {loading.deleteAccount ? "Deleting..." : "Delete stylist account"}
                  </SiteButton>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      {productModalOpen ? (
        <div className="vendor-profile-modal-backdrop" onClick={() => setProductModalOpen(false)}>
          <form className="vendor-profile-modal" onSubmit={handleProductSubmit} onClick={(event) => event.stopPropagation()}>
            <div className="vendor-profile-modal-head">
              <h4>{editingProductId ? "Edit Product" : "Add a Product"}</h4>
              <button type="button" onClick={() => setProductModalOpen(false)} aria-label="Close product modal">
                <X size={26} />
              </button>
            </div>

            <label className="vendor-profile-field">
              <span>Product Name</span>
              <input
                className="form-control"
                placeholder="Ex: Bundles"
                value={productForm.name}
                onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))}
                required
              />
            </label>
            <label className="vendor-profile-field">
              <span>Price</span>
              <input
                className="form-control"
                type="number"
                min="0"
                step="0.01"
                value={productForm.price}
                onChange={(event) => setProductForm((current) => ({ ...current, price: event.target.value }))}
              />
            </label>
            <label className="vendor-profile-field">
              <span>Category</span>
              <select
                className="form-control"
                value={productForm.category}
                onChange={(event) => setProductForm((current) => ({ ...current, category: event.target.value }))}
              >
                {PRODUCT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label className="vendor-profile-field">
              <span>Description</span>
              <textarea
                className="form-control"
                rows="6"
                placeholder="Type Here..."
                value={productForm.description}
                onChange={(event) => setProductForm((current) => ({ ...current, description: event.target.value }))}
              />
            </label>

            <SiteButton disabled={loading.profile} fullWidth type="submit">
              {loading.profile ? "Saving..." : "Save"}
            </SiteButton>
          </form>
        </div>
      ) : null}

      {mediaModal.open && activeMediaItem ? (
        <div className="vendor-profile-modal-backdrop" onClick={() => setMediaModal({ open: false, itemId: "" })}>
          <form className="vendor-profile-modal vendor-media-modal" onSubmit={saveMediaEditor} onClick={(event) => event.stopPropagation()}>
            <div className="vendor-profile-modal-head">
              <h4>Edit Image</h4>
              <button type="button" onClick={() => setMediaModal({ open: false, itemId: "" })} aria-label="Close media modal">
                <X size={22} />
              </button>
            </div>

            {activeMediaItem.type === "video" ? (
              <video src={activeMediaItem.url} className="vendor-media-modal-preview" controls />
            ) : (
              <img src={activeMediaItem.url} alt="Selected gallery media" className="vendor-media-modal-preview" />
            )}

            <label className="vendor-profile-field">
              <span>Service</span>
              <select
                className="form-control"
                value={mediaForm.serviceId}
                onChange={(event) => setMediaForm((current) => ({ ...current, serviceId: event.target.value }))}
              >
                <option value="">Select Service</option>
                {services.map((service) => (
                  <option key={service.id || service.title} value={service.id || service.title}>
                    {service.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="vendor-profile-field">
              <span>Client</span>
              <input
                className="form-control"
                placeholder="Select Client"
                value={mediaForm.clientName}
                onChange={(event) => setMediaForm((current) => ({ ...current, clientName: event.target.value }))}
              />
            </label>
            <label className="vendor-profile-field">
              <span>Caption</span>
              <textarea
                className="form-control"
                rows="4"
                placeholder="Add a short description"
                value={mediaForm.caption}
                onChange={(event) => setMediaForm((current) => ({ ...current, caption: event.target.value }))}
              />
            </label>

            <SiteButton disabled={loading.profile} fullWidth type="submit">
              {loading.profile ? "Saving..." : "Save"}
            </SiteButton>
            <button type="button" className="vendor-delete-media-button" onClick={() => deleteMediaItem(activeMediaItem.id)}>
              Delete Image
            </button>
          </form>
        </div>
      ) : null}

      {bookingDetailModal ? (
        <div className="vendor-profile-modal-backdrop" onClick={() => setBookingDetailModal(null)}>
          <div className="vendor-profile-modal" onClick={(event) => event.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="vendor-profile-modal-head">
              <h4>Booking Details</h4>
              <button type="button" onClick={() => setBookingDetailModal(null)} aria-label="Close booking details">
                <X size={22} />
              </button>
            </div>

            <div style={{ display: "grid", gap: "14px", padding: "4px 0" }}>
              <div className="vendor-availability-detail-row" style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                <span style={{ color: "#6b7280" }}>Client</span>
                <strong style={{ color: "#111827", textAlign: "right" }}>{bookingDetailModal.customerName}</strong>
              </div>
              <div className="vendor-availability-detail-row" style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                <span style={{ color: "#6b7280" }}>Email</span>
                <strong style={{ color: "#111827", textAlign: "right" }}>{bookingDetailModal.customerEmail}</strong>
              </div>
              {bookingDetailModal.customerPhone ? (
                <div className="vendor-availability-detail-row" style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                  <span style={{ color: "#6b7280" }}>Phone</span>
                  <strong style={{ color: "#111827", textAlign: "right" }}>{bookingDetailModal.customerPhone}</strong>
                </div>
              ) : null}
              <div className="vendor-availability-detail-row" style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                <span style={{ color: "#6b7280" }}>Service</span>
                <strong style={{ color: "#111827", textAlign: "right" }}>{bookingDetailModal.serviceName}</strong>
              </div>
              <div className="vendor-availability-detail-row" style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                <span style={{ color: "#6b7280" }}>Date</span>
                <strong style={{ color: "#111827", textAlign: "right" }}>{formatLineupDate(bookingDetailModal.appointmentDate)}</strong>
              </div>
              <div className="vendor-availability-detail-row" style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                <span style={{ color: "#6b7280" }}>Time</span>
                <strong style={{ color: "#111827", textAlign: "right" }}>{bookingDetailModal.appointmentSlot}</strong>
              </div>
              <div className="vendor-availability-detail-row" style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                <span style={{ color: "#6b7280" }}>Status</span>
                <strong style={{ color: "#111827", textAlign: "right" }}>{bookingDetailModal.status}</strong>
              </div>
              <div className="vendor-availability-detail-row" style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                <span style={{ color: "#6b7280" }}>Total</span>
                <strong style={{ color: "#111827", textAlign: "right" }}>{formatCurrency(bookingDetailModal.total)}</strong>
              </div>
              {bookingDetailModal.depositAmount ? (
                <div className="vendor-availability-detail-row" style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                  <span style={{ color: "#6b7280" }}>Deposit</span>
                  <strong style={{ color: "#111827", textAlign: "right" }}>{formatCurrency(bookingDetailModal.depositAmount)}</strong>
                </div>
              ) : null}
              {bookingDetailModal.notes ? (
                <div style={{ padding: "10px 0", borderTop: "1px solid #e5e7eb" }}>
                  <span style={{ color: "#6b7280", fontSize: "0.85rem" }}>Notes</span>
                  <p style={{ margin: "6px 0 0", color: "#374151", fontSize: "0.9rem" }}>{bookingDetailModal.notes}</p>
                </div>
              ) : null}

              <div style={{ display: "flex", gap: "8px", paddingTop: "8px" }}>
                {bookingDetailModal.status === "pending_approval" ? (
                  <>
                    <button
                      type="button"
                      disabled={loading.bookingAction === bookingDetailModal.id}
                      onClick={() => {
                        performBookingAction(bookingDetailModal.id, { action: "approve" }, "Booking approved.");
                        setBookingDetailModal(null);
                      }}
                      style={{
                        flex: 1,
                        padding: "10px",
                        borderRadius: "10px",
                        border: "none",
                        background: "#16a34a",
                        color: "#fff",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      disabled={loading.bookingAction === bookingDetailModal.id}
                      onClick={() => {
                        performBookingAction(bookingDetailModal.id, { action: "decline", reason: "" }, "Booking declined.");
                        setBookingDetailModal(null);
                      }}
                      style={{
                        flex: 1,
                        padding: "10px",
                        borderRadius: "10px",
                        border: "1px solid #dc2626",
                        background: "#fff",
                        color: "#dc2626",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Reject
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    openConversationForBooking(bookingDetailModal.id);
                    setBookingDetailModal(null);
                  }}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: "10px",
                    border: "1px solid #e2e8f0",
                    background: "#fff",
                    color: "#475569",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Message
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      </div>

      {activeConversationId && activeSection !== "messages" ? (
        <MessengerWidget
          conversationId={activeConversationId}
          recipientName={activeConversation?.customerName || "Client"}
          recipientAvatar=""
          userRole="vendor"
          controlledOpen={widgetOpen}
          onToggle={(v) => setWidgetOpen(v)}
          externalMessages={threadState.messages}
          externalDraft={threadState.draft}
          externalSending={threadState.sending}
          externalLoading={threadState.loading}
          externalError={threadState.error}
          onSend={handleWidgetSend}
          onDraftChange={handleWidgetDraftChange}
          onLoadMessages={handleWidgetLoadMessages}
          onExpand={handleWidgetExpand}
        />
      ) : null}

      <VoiceCallUI
        callState={callAPI.callState}
        callMeta={callAPI.callMeta}
        durationLabel={callAPI.durationLabel}
        isMuted={callAPI.isMuted}
        isSpeakerOn={callAPI.isSpeakerOn}
        error={callAPI.error}
        remoteAudioRef={callAPI.remoteAudioRef}
        onAccept={callAPI.acceptCall}
        onReject={callAPI.rejectCall}
        onEnd={() => callAPI.endCall("ended")}
        onToggleMute={callAPI.toggleMute}
        onToggleSpeaker={callAPI.toggleSpeaker}
      />

      {showMicPermissionModal ? (
        <MicPermissionModal onClose={() => setShowMicPermissionModal(false)} />
      ) : null}
    </div>
  );
}
