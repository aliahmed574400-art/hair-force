"use client";

import { useEffect, useMemo } from "react";
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, X } from "lucide-react";

function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter((p) => p)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function Avatar({ name, avatar, size = 96 }) {
  const initials = getInitials(name);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: avatar ? "transparent" : "#3b82f6",
        color: avatar ? "inherit" : "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.4,
        fontWeight: 600,
        overflow: "hidden",
        flexShrink: 0
      }}
    >
      {avatar ? (
        <img src={avatar} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        initials
      )}
    </div>
  );
}

function PulsingRing({ children }) {
  return (
    <div style={{ position: "relative", display: "inline-flex" }}>
      <span
        style={{
          position: "absolute",
          inset: -12,
          borderRadius: "50%",
          border: "2px solid rgba(59, 130, 246, 0.5)",
          animation: "pulse-ring 1.5s ease-out infinite"
        }}
      />
      <span
        style={{
          position: "absolute",
          inset: -24,
          borderRadius: "50%",
          border: "2px solid rgba(59, 130, 246, 0.25)",
          animation: "pulse-ring 1.5s ease-out 0.4s infinite"
        }}
      />
      {children}
      <style jsx>{`
        @keyframes pulse-ring {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(1.3);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

export function VoiceCallUI({
  callState,
  callMeta,
  durationLabel,
  isMuted,
  isSpeakerOn,
  error,
  remoteAudioRef,
  onAccept,
  onReject,
  onEnd,
  onToggleMute,
  onToggleSpeaker
}) {
  const visible = useMemo(() => {
    return ["calling", "receiving", "connecting", "connected", "ended"].includes(callState);
  }, [callState]);

  // Auto-close "ended" state is handled by hook; here we just render.
  if (!visible || !callMeta) return null;

  const name = callMeta.isCaller ? callMeta.recipientName : callMeta.callerName;
  const avatar = callMeta.isCaller ? callMeta.recipientAvatar : callMeta.callerAvatar;
  const isBusy = error === "Vendor is currently busy";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        textAlign: "center"
      }}
    >
      <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: "none" }} />

      {/* Calling / Connecting / Outgoing */}
      {(callState === "calling" || callState === "connecting") && (
        <>
          <PulsingRing>
            <Avatar name={name} avatar={avatar} size={120} />
          </PulsingRing>
          <h2 style={{ margin: "24px 0 8px", fontSize: 24, fontWeight: 600 }}>{name}</h2>
          <p style={{ color: "#94a3b8", fontSize: 16, margin: 0 }}>
            {callState === "connecting" ? "Connecting..." : "Calling..."}
          </p>
          <p style={{ color: "#cbd5e1", fontSize: 18, marginTop: 12, fontVariantNumeric: "tabular-nums" }}>
            {durationLabel}
          </p>
          <div style={{ marginTop: "auto", paddingBottom: 48 }}>
            <button
              type="button"
              onClick={onEnd}
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: "#dc2626",
                border: "none",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 8px 24px rgba(220, 38, 38, 0.4)"
              }}
            >
              <PhoneOff size={32} />
            </button>
            <p style={{ marginTop: 10, fontSize: 13, color: "#cbd5e1" }}>End call</p>
          </div>
        </>
      )}

      {/* Incoming */}
      {callState === "receiving" && (
        <>
          <p style={{ fontSize: 18, color: "#94a3b8", marginBottom: 24 }}>Incoming Call</p>
          <PulsingRing>
            <Avatar name={name} avatar={avatar} size={120} />
          </PulsingRing>
          <h2 style={{ margin: "24px 0 8px", fontSize: 24, fontWeight: 600 }}>{name}</h2>
          <p style={{ color: "#94a3b8", fontSize: 16, margin: 0 }}>is calling you...</p>
          <div style={{ marginTop: "auto", paddingBottom: 48, display: "flex", gap: 32, alignItems: "center" }}>
            <button
              type="button"
              onClick={onReject}
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: "#dc2626",
                border: "none",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 8px 24px rgba(220, 38, 38, 0.4)"
              }}
            >
              <PhoneOff size={32} />
            </button>
            <button
              type="button"
              onClick={onAccept}
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: "#16a34a",
                border: "none",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 8px 24px rgba(22, 163, 74, 0.4)"
              }}
            >
              <Phone size={32} />
            </button>
          </div>
        </>
      )}

      {/* Connected */}
      {callState === "connected" && (
        <>
          <Avatar name={name} avatar={avatar} size={120} />
          <h2 style={{ margin: "24px 0 8px", fontSize: 24, fontWeight: 600 }}>{name}</h2>
          <p style={{ color: "#4ade80", fontSize: 14, margin: 0, display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80" }} />
            Connected
          </p>
          <p style={{ color: "#cbd5e1", fontSize: 28, marginTop: 12, fontVariantNumeric: "tabular-nums", fontWeight: 500 }}>
            {durationLabel}
          </p>
          <div style={{ marginTop: "auto", paddingBottom: 48, display: "flex", gap: 24, alignItems: "center" }}>
            <button
              type="button"
              onClick={onToggleMute}
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                background: isMuted ? "#dc2626" : "rgba(255,255,255,0.15)",
                border: "none",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer"
              }}
            >
              {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
            </button>
            <button
              type="button"
              onClick={onEnd}
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: "#dc2626",
                border: "none",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 8px 24px rgba(220, 38, 38, 0.4)"
              }}
            >
              <PhoneOff size={32} />
            </button>
            <button
              type="button"
              onClick={onToggleSpeaker}
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                background: isSpeakerOn ? "#3b82f6" : "rgba(255,255,255,0.15)",
                border: "none",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer"
              }}
            >
              {isSpeakerOn ? <Volume2 size={24} /> : <VolumeX size={24} />}
            </button>
          </div>
        </>
      )}

      {/* Ended / Error / Busy */}
      {callState === "ended" && (
        <>
          <Avatar name={name} avatar={avatar} size={120} />
          <h2 style={{ margin: "24px 0 8px", fontSize: 24, fontWeight: 600 }}>{name}</h2>
          <p style={{ color: isBusy ? "#f87171" : "#94a3b8", fontSize: 16, margin: 0 }}>
            {isBusy ? "Vendor is currently busy" : error || "Call ended"}
          </p>
          {!isBusy && durationLabel !== "00:00" && (
            <p style={{ color: "#cbd5e1", fontSize: 18, marginTop: 8 }}>{durationLabel}</p>
          )}
        </>
      )}
    </div>
  );
}

export function BusyModal({ vendorName, onSendMessage, onClose }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9998,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          padding: 28,
          maxWidth: 360,
          width: "100%",
          textAlign: "center",
          boxShadow: "0 20px 50px rgba(0,0,0,0.2)"
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "#fee2e2",
            color: "#dc2626",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px"
          }}
        >
          <PhoneOff size={28} />
        </div>
        <h3 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700, color: "#111827" }}>
          🔴 {vendorName}
        </h3>
        <p style={{ color: "#4b5563", margin: "0 0 8px", fontSize: 15 }}>Vendor is currently busy</p>
        <p style={{ color: "#6b7280", fontSize: 14, margin: "0 0 24px" }}>
          Please try again later or send a message instead.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button
            type="button"
            onClick={onSendMessage}
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              background: "#111827",
              color: "#fff",
              border: "none",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 14
            }}
          >
            💬 Send Message
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              background: "#f3f4f6",
              color: "#374151",
              border: "none",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 14
            }}
          >
            ✕ Try Later
          </button>
        </div>
      </div>
    </div>
  );
}

export function MicPermissionModal({ onClose }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9998,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          padding: 28,
          maxWidth: 360,
          width: "100%",
          textAlign: "center"
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "#fef3c7",
            color: "#d97706",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px"
          }}
        >
          <MicOff size={28} />
        </div>
        <h3 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700, color: "#111827" }}>
          Microphone access needed
        </h3>
        <p style={{ color: "#4b5563", fontSize: 15, margin: "0 0 24px" }}>
          Please allow microphone access in your browser settings to make voice calls.
        </p>
        <button
          type="button"
          onClick={onClose}
          style={{
            padding: "10px 18px",
            borderRadius: 10,
            background: "#111827",
            color: "#fff",
            border: "none",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: 14
          }}
        >
          Got it
        </button>
      </div>
    </div>
  );
}
