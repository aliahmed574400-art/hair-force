"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Loader2,
  MessageSquareText,
  Scissors,
  Sparkles,
  X
} from "lucide-react";

function getNotificationInitials(notification) {
  const source = String(notification?.clientName || notification?.title || "HF");
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function formatNotificationTime(value) {
  if (!value) {
    return "Just now";
  }

  const diffMs = Date.now() - new Date(value).getTime();

  if (!Number.isFinite(diffMs) || diffMs <= 0) {
    return "Just now";
  }

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < hour) {
    return `${Math.max(1, Math.round(diffMs / minute))}m ago`;
  }

  if (diffMs < day) {
    return `${Math.max(1, Math.round(diffMs / hour))}h ago`;
  }

  return `${Math.max(1, Math.round(diffMs / day))}d ago`;
}

function getNotificationTone(notification) {
  const type = String(notification?.type || "");

  if (type === "booking_cancelled" || type === "booking_declined") {
    return "danger";
  }

  if (type === "booking_rescheduled" || type === "booking_request") {
    return "warning";
  }

  if (type === "booking_message") {
    return "info";
  }

  return "success";
}

function NotificationTypeIcon({ notification }) {
  const type = String(notification?.type || "");

  if (type === "booking_message") {
    return <MessageSquareText size={16} />;
  }

  if (type === "booking_request" || type === "booking_rescheduled") {
    return <CalendarDays size={16} />;
  }

  if (type === "booking_cancelled" || type === "booking_declined") {
    return <Clock3 size={16} />;
  }

  if (type === "booking_completed" || type === "booking_approved") {
    return <CheckCircle2 size={16} />;
  }

  return <Scissors size={16} />;
}

function NotificationDetailModal({ detail, onClose, onOpenSection }) {
  const notification = detail.notification;
  const conversation = detail.conversation;
  const messages = detail.messages || [];
  const bookingStatus = notification?.metadata?.bookingStatus || "";
  const previousDate = notification?.metadata?.previousAppointmentDate || "";
  const previousSlot = notification?.metadata?.previousAppointmentSlot || "";
  const reason = notification?.metadata?.reason || notification?.metadata?.cancellationReason || "";

  return (
    <div className="vendor-notification-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="vendor-notification-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="vendor-notification-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="vendor-notification-modal-head">
          <div>
            <div className="vendor-notification-modal-eyebrow">
              {conversation ? "Client message" : "Booking activity"}
            </div>
            <h3 id="vendor-notification-modal-title">{notification?.title || "Notification"}</h3>
          </div>
          <button
            type="button"
            className="vendor-notification-modal-close"
            aria-label="Close notification detail"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="vendor-notification-modal-body">
          {detail.loading ? (
            <div className="vendor-notification-modal-state">
              <Loader2 size={18} className="spin" />
              <span>Loading details…</span>
            </div>
          ) : detail.error ? (
            <div className="vendor-notification-modal-state error">{detail.error}</div>
          ) : (
            <>
              <div className="vendor-notification-detail-grid">
                <div className="vendor-notification-detail-card">
                  <span>Client</span>
                  <strong>{notification?.clientName || conversation?.customerName || "Client"}</strong>
                </div>
                <div className="vendor-notification-detail-card">
                  <span>Service</span>
                  <strong>{notification?.serviceName || conversation?.serviceName || "Booking service"}</strong>
                </div>
                <div className="vendor-notification-detail-card">
                  <span>Appointment</span>
                  <strong>
                    {notification?.appointmentDate || conversation?.appointmentDate || "Date pending"}
                    {notification?.appointmentSlot || conversation?.appointmentSlot
                      ? ` · ${notification?.appointmentSlot || conversation?.appointmentSlot}`
                      : ""}
                  </strong>
                </div>
                <div className="vendor-notification-detail-card">
                  <span>Status</span>
                  <strong>{bookingStatus || notification?.type?.replace(/_/g, " ") || "Activity"}</strong>
                </div>
              </div>

              <div className="vendor-notification-detail-story">
                <div className="vendor-notification-detail-story-head">
                  <span className={`vendor-notification-detail-tone ${getNotificationTone(notification)}`}>
                    <NotificationTypeIcon notification={notification} />
                  </span>
                  <div>
                    <strong>{notification?.title}</strong>
                    <p>{notification?.message}</p>
                  </div>
                </div>

                {previousDate || previousSlot ? (
                  <p className="vendor-notification-detail-note">
                    Previous slot: {previousDate || "Previous date"}{previousSlot ? ` at ${previousSlot}` : ""}
                  </p>
                ) : null}

                {reason ? (
                  <p className="vendor-notification-detail-note">Reason: {reason}</p>
                ) : null}
              </div>

              {conversation ? (
                <div className="vendor-notification-thread-preview">
                  <div className="vendor-notification-thread-head">
                    <strong>Recent messages</strong>
                    <span>{messages.length} messages</span>
                  </div>
                  <div className="vendor-notification-thread-list">
                    {messages.length ? (
                      messages.slice(-4).map((message) => (
                        <div
                          key={message.id}
                          className={`vendor-notification-thread-bubble ${
                            message.senderRole === "vendor" ? "mine" : ""
                          }`}
                        >
                          <strong>
                            {message.senderRole === "vendor"
                              ? "You"
                              : notification?.clientName || conversation?.customerName || "Client"}
                          </strong>
                          <p>{message.body}</p>
                        </div>
                      ))
                    ) : (
                      <p className="vendor-notification-detail-note">No messages yet in this thread.</p>
                    )}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>

        <div className="vendor-notification-modal-actions">
          <button type="button" className="vendor-notification-action secondary" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="vendor-notification-action"
            onClick={() => onOpenSection(conversation ? "messages" : "bookings")}
          >
            {conversation ? "Open inbox" : "Open bookings"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VendorNotificationsPopover({ className = "" }) {
  const router = useRouter();
  const buttonRef = useRef(null);
  const popoverRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [popoverStyle, setPopoverStyle] = useState({});
  const [detail, setDetail] = useState({
    open: false,
    loading: false,
    error: "",
    notification: null,
    conversation: null,
    messages: []
  });

  useEffect(() => {
    let cancelled = false;

    async function loadSummary() {
      try {
        const response = await fetch("/api/dashboard/notifications", {
          cache: "no-store"
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to load notifications.");
        }

        if (!cancelled) {
          setNotifications(data.notifications || []);
          setUnreadNotificationCount(Number(data.unreadNotificationCount || 0));
          setError("");
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message);
        }
      }
    }

    function handleVisibility() {
      if (document.visibilityState === "visible") {
        void loadSummary();
      }
    }

    window.addEventListener("focus", loadSummary);
    document.addEventListener("visibilitychange", handleVisibility);
    void loadSummary();

    return () => {
      cancelled = true;
      window.removeEventListener("focus", loadSummary);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function updatePosition() {
      const button = buttonRef.current;

      if (!button) {
        return;
      }

      const rect = button.getBoundingClientRect();
      const preferredWidth = Math.min(420, window.innerWidth - 24);
      const left = Math.min(
        Math.max(12, rect.right - preferredWidth),
        Math.max(12, window.innerWidth - preferredWidth - 12)
      );

      setPopoverStyle({
        top: `${rect.bottom + 14}px`,
        left: `${left}px`,
        width: `${preferredWidth}px`
      });
    }

    function handlePointer(event) {
      if (
        popoverRef.current?.contains(event.target) ||
        buttonRef.current?.contains(event.target)
      ) {
        return;
      }

      setIsOpen(false);
    }

    function handleKeydown(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKeydown);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKeydown);
    };
  }, [isOpen]);

  async function togglePopover() {
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    setIsOpen(true);
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/dashboard/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "markAllRead" })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load notifications.");
      }

      setNotifications(data.notifications || []);
      setUnreadNotificationCount(Number(data.unreadNotificationCount || 0));
    } catch (toggleError) {
      setError(toggleError.message);
    } finally {
      setLoading(false);
    }
  }

  async function openNotificationDetail(notification) {
    const shouldLoadConversation =
      notification.type === "booking_message" && Boolean(notification.conversationId);

    setIsOpen(false);
    setDetail({
      open: true,
      loading: shouldLoadConversation,
      error: "",
      notification,
      conversation: null,
      messages: []
    });

    if (!shouldLoadConversation) {
      return;
    }

    try {
      const response = await fetch(`/api/dashboard/messages/${notification.conversationId}`, {
        cache: "no-store"
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load conversation.");
      }

      setDetail({
        open: true,
        loading: false,
        error: "",
        notification,
        conversation: data.conversation || null,
        messages: data.messages || []
      });
    } catch (detailError) {
      setDetail({
        open: true,
        loading: false,
        error: detailError.message,
        notification,
        conversation: null,
        messages: []
      });
    }
  }

  function closeDetail() {
    setDetail({
      open: false,
      loading: false,
      error: "",
      notification: null,
      conversation: null,
      messages: []
    });
  }

  function openSection(section) {
    closeDetail();
    router.push(`/dashboard?section=${section}`);
  }

  return (
    <div className="vendor-notifications-anchor">
      <button
        ref={buttonRef}
        type="button"
        className={className}
        aria-label={
          unreadNotificationCount
            ? `Open notifications, ${unreadNotificationCount} unread`
            : "Open notifications"
        }
        aria-expanded={isOpen}
        onClick={togglePopover}
      >
        <Bell size={18} />
        {unreadNotificationCount ? (
          <span className="topbar-vendor-badge">{Math.min(unreadNotificationCount, 9)}</span>
        ) : null}
      </button>

      {isOpen ? (
        <div ref={popoverRef} className="vendor-notifications-popover-card" style={popoverStyle}>
          <div className="vendor-notifications-popover-head">
            <div>
              <span className="vendor-notifications-popover-eyebrow">Activity</span>
              <h3>Notifications</h3>
            </div>
            <span className="vendor-notifications-popover-count">
              {unreadNotificationCount ? `${unreadNotificationCount} unread` : "All caught up"}
            </span>
          </div>

          <div className="vendor-notifications-popover-body">
            {loading ? (
              <div className="vendor-notifications-popover-state">
                <Loader2 size={18} className="spin" />
                <span>Loading notifications…</span>
              </div>
            ) : error ? (
              <div className="vendor-notifications-popover-state error">{error}</div>
            ) : notifications.length ? (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  className={`vendor-notification-item ${!notification.readAt ? "is-unread" : ""}`}
                  onClick={() => openNotificationDetail(notification)}
                >
                  <span className="vendor-notification-avatar">
                    {notification.clientAvatar ? (
                      <img src={notification.clientAvatar} alt="" />
                    ) : (
                      <span>{getNotificationInitials(notification)}</span>
                    )}
                  </span>
                  <span className={`vendor-notification-type ${getNotificationTone(notification)}`}>
                    <NotificationTypeIcon notification={notification} />
                  </span>
                  <span className="vendor-notification-copy">
                    <span className="vendor-notification-copy-head">
                      <strong>{notification.clientName || notification.title || "Client activity"}</strong>
                      <small>{formatNotificationTime(notification.createdAt)}</small>
                    </span>
                    <span className="vendor-notification-title">{notification.title}</span>
                    <span className="vendor-notification-message">{notification.message}</span>
                    <span className="vendor-notification-meta">
                      <Sparkles size={14} />
                      <span>
                        {notification.serviceName || "Booking"}
                        {notification.appointmentDate ? ` · ${notification.appointmentDate}` : ""}
                        {notification.appointmentSlot ? ` · ${notification.appointmentSlot}` : ""}
                      </span>
                    </span>
                  </span>
                </button>
              ))
            ) : (
              <div className="vendor-notifications-popover-empty">
                <div className="vendor-notifications-popover-empty-icon">
                  <Bell size={18} />
                </div>
                <strong>No notifications yet</strong>
                <p>New bookings, client messages, and booking changes will appear here.</p>
              </div>
            )}
          </div>

          <div className="vendor-notifications-popover-foot">
            <button type="button" className="vendor-notification-action secondary" onClick={() => openSection("bookings")}>
              Open bookings
            </button>
            <button type="button" className="vendor-notification-action" onClick={() => openSection("messages")}>
              Open inbox
            </button>
          </div>
        </div>
      ) : null}

      {detail.open ? (
        <NotificationDetailModal
          detail={detail}
          onClose={closeDetail}
          onOpenSection={openSection}
        />
      ) : null}
    </div>
  );
}
