"use client";

import { useAppointmentNotifications } from "@/hooks/useAppointmentNotifications";
import { NotificationToast, NotificationToastContainer } from "@/components/NotificationToast";

export function AppointmentNotificationToasts({ onUpdate }) {
  const { toasts, removeToast } = useAppointmentNotifications({ onUpdate });

  if (!toasts.length) return null;

  return (
    <NotificationToastContainer>
      {toasts.map((toast) => (
        <NotificationToast
          key={toast.id}
          id={toast.id}
          title={toast.title}
          message={toast.message}
          severity={toast.severity}
          action={toast.action}
          onDismiss={removeToast}
        />
      ))}
    </NotificationToastContainer>
  );
}
