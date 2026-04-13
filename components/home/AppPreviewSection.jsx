import Link from "next/link";
import { CalendarDays, Clock3 } from "lucide-react";
import Reveal from "@/components/animated/Reveal";
import PhoneFrame from "@/components/home/PhoneFrame";

const calendarLabels = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const calendarDays = [
  { label: "11" },
  { label: "12" },
  { label: "13" },
  { label: "14" },
  { label: "15" },
  { label: "16", active: true },
  { label: "17" },
  { label: "18" },
  { label: "19" },
  { label: "20" },
  { label: "21" },
  { label: "22", muted: true },
  { label: "23" },
  { label: "24" }
];

const appointmentSlots = [
  { time: "10:30 AM", service: "Signature Blowout", status: "Confirmed" },
  { time: "1:00 PM", service: "Color Refresh", status: "Deposit paid" }
];

export default function AppPreviewSection() {
  return (
    <div className="app-preview-grid">
      <Reveal className="app-preview-copy" y={22}>
        <span className="eyebrow">App Preview</span>
        <h2>Manage Everything — Right From Your Device</h2>
        <p>
          Book appointments, track clients, and grow your business — all in one powerful
          platform.
        </p>

        <div className="app-preview-actions">
          <Link href="#faqs" className="button button-primary">
            Explore Features
          </Link>
          <Link href="/join" className="button button-secondary">
            Get Started
          </Link>
        </div>
      </Reveal>

      <Reveal className="app-preview-device-zone" delay={0.12} y={28}>
        <div className="app-preview-shadow" aria-hidden="true" />

        <div className="app-preview-floating">
          <PhoneFrame className="app-preview-phone">
            <div className="app-preview-phone-screen">
              <div className="app-preview-topbar">
                <span className="badge badge-accent">Hair Force</span>
                <span className="app-preview-status">Live sync</span>
              </div>

              <div className="app-preview-tab-row">
                <span className="app-preview-tab is-active">Booking</span>
                <span className="app-preview-tab">Calendar</span>
                <span className="app-preview-tab">Profile</span>
              </div>

              <div className="app-preview-widget">
                <div className="app-preview-widget-head">
                  <div className="app-preview-widget-icon">
                    <Clock3 strokeWidth={1.8} aria-hidden="true" />
                  </div>
                  <div>
                    <span>Booking screen</span>
                    <strong>Appointments at a glance</strong>
                  </div>
                </div>

                <div className="app-preview-booking-list">
                  {appointmentSlots.map((slot) => (
                    <div key={slot.time} className="app-preview-booking-item">
                      <div>
                        <strong>{slot.time}</strong>
                        <p>{slot.service}</p>
                      </div>
                      <span>{slot.status}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="app-preview-widget">
                <div className="app-preview-widget-head">
                  <div className="app-preview-widget-icon">
                    <CalendarDays strokeWidth={1.8} aria-hidden="true" />
                  </div>
                  <div>
                    <span>Calendar</span>
                    <strong>Track availability instantly</strong>
                  </div>
                </div>

                <div className="app-preview-calendar">
                  <div className="app-preview-calendar-labels">
                    {calendarLabels.map((label) => (
                      <span key={label}>{label}</span>
                    ))}
                  </div>
                  <div className="app-preview-calendar-grid">
                    {calendarDays.map((day) => (
                      <span
                        key={day.label}
                        className={`app-preview-calendar-cell${day.active ? " is-active" : ""}${
                          day.muted ? " is-muted" : ""
                        }`}
                      >
                        {day.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </PhoneFrame>
        </div>
      </Reveal>
    </div>
  );
}
