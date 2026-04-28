"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SiteButton from "@/components/ui/SiteButton";

const OTP_LENGTH = 6;
const DEFAULT_OTP_TTL_SECONDS = 60;

function createEmptyOtpDigits() {
  return Array.from({ length: OTP_LENGTH }, () => "");
}

function formatTimer(secondsLeft) {
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function PhoneSigninPanel({ className = "" }) {
  const router = useRouter();
  const otpRefs = useRef([]);
  const [step, setStep] = useState("idle");
  const [phone, setPhone] = useState("");
  const [otpDigits, setOtpDigits] = useState(createEmptyOtpDigits);
  const [otpMeta, setOtpMeta] = useState({
    phone: "",
    secondsLeft: DEFAULT_OTP_TTL_SECONDS,
    devCode: ""
  });
  const [status, setStatus] = useState({ loading: false, message: "" });

  useEffect(() => {
    if (step !== "verify") {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setOtpMeta((current) =>
        current.secondsLeft > 0
          ? { ...current, secondsLeft: current.secondsLeft - 1 }
          : current
      );
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [step]);

  function goBackToIdle() {
    setStep("idle");
    setOtpDigits(createEmptyOtpDigits());
    setOtpMeta({
      phone: "",
      secondsLeft: DEFAULT_OTP_TTL_SECONDS,
      devCode: ""
    });
    setStatus({ loading: false, message: "" });
  }

  function applyOtpDigits(rawValue, startIndex) {
    const digits = rawValue.replace(/\D/g, "");

    if (!digits) {
      setOtpDigits((current) => {
        const next = [...current];
        next[startIndex] = "";
        return next;
      });
      return;
    }

    setOtpDigits((current) => {
      const next = [...current];

      digits.split("").forEach((digit, offset) => {
        const targetIndex = startIndex + offset;

        if (targetIndex < OTP_LENGTH) {
          next[targetIndex] = digit;
        }
      });

      return next;
    });

    const nextFocusIndex = Math.min(startIndex + digits.length, OTP_LENGTH - 1);
    window.setTimeout(() => otpRefs.current[nextFocusIndex]?.focus(), 0);
  }

  async function requestOtp(isResend = false) {
    const nextPhone = String(phone || "").trim();

    if (!nextPhone) {
      setStatus({ loading: false, message: "Enter your phone number first." });
      return;
    }

    setStatus({ loading: true, message: "" });

    try {
      const response = await fetch("/api/auth/phone/signin/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: nextPhone })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "We could not send the verification code.");
      }

      setOtpDigits(createEmptyOtpDigits());
      setOtpMeta({
        phone: data.phone || nextPhone,
        secondsLeft: Number(data.expiresIn || DEFAULT_OTP_TTL_SECONDS),
        devCode: data.devCode || ""
      });
      setStep("verify");
      setStatus({
        loading: false,
        message: isResend ? "A fresh verification code is ready." : "Enter the code to sign in."
      });
      window.setTimeout(() => otpRefs.current[0]?.focus(), 0);
    } catch (error) {
      setStatus({ loading: false, message: error.message });
    }
  }

  async function handleVerify(event) {
    event.preventDefault();

    const code = otpDigits.join("");

    if (code.length !== OTP_LENGTH) {
      setStatus({ loading: false, message: `Enter the ${OTP_LENGTH}-digit code to continue.` });
      return;
    }

    setStatus({ loading: true, message: "" });

    try {
      const response = await fetch("/api/auth/phone/signin/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: otpMeta.phone || phone,
          code
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "That code could not be verified.");
      }

      setStatus({
        loading: false,
        message: `Welcome back, ${data.user.name || "client"}.`
      });

      const nextHref = data.user?.role === "admin" ? "/admin" : "/dashboard";
      router.push(nextHref);
      router.refresh();
    } catch (error) {
      setStatus({ loading: false, message: error.message });
    }
  }

  return (
    <div className={`phone-auth-shell ${className}`.trim()}>
      {step === "idle" ? (
        <SiteButton
          className="auth-provider-button"
          onClick={() => setStep("request")}
          type="button"
          variant="secondary"
        >
          Continue with Number
        </SiteButton>
      ) : (
        <div className="phone-auth-card">
          <div className="phone-auth-header">
            <div className="phone-auth-copy">
              <strong>Continue with Number</strong>
              <span className="muted tiny">
                Use your phone number and a one-time verification code to sign in.
              </span>
            </div>
            <button type="button" className="auth-back-link" onClick={goBackToIdle}>
              Back
            </button>
          </div>

          {step === "request" ? (
            <form
              className="form-grid"
              onSubmit={(event) => {
                event.preventDefault();
                requestOtp(false);
              }}
            >
              <div className="form-field form-span-2">
                <label className="form-label" htmlFor="signin-phone-number">
                  Phone number
                </label>
                <input
                  id="signin-phone-number"
                  className="form-control"
                  type="tel"
                  placeholder="+92 300 1234567"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  required
                />
              </div>

              <SiteButton className="form-span-2" disabled={status.loading} fullWidth type="submit">
                {status.loading ? "Sending code..." : "Send OTP"}
              </SiteButton>
            </form>
          ) : null}

          {step === "verify" ? (
            <form className="signup-otp-form" onSubmit={handleVerify}>
              <div className="signup-otp-grid">
                {otpDigits.map((digit, index) => (
                  <input
                    key={`signin-otp-${index}`}
                    ref={(element) => {
                      otpRefs.current[index] = element;
                    }}
                    className="signup-otp-input"
                    inputMode="numeric"
                    autoComplete={index === 0 ? "one-time-code" : "off"}
                    maxLength={OTP_LENGTH}
                    value={digit}
                    onChange={(event) => applyOtpDigits(event.target.value, index)}
                    onKeyDown={(event) => {
                      if (event.key === "Backspace" && !otpDigits[index] && index > 0) {
                        otpRefs.current[index - 1]?.focus();
                      }

                      if (event.key === "ArrowLeft" && index > 0) {
                        otpRefs.current[index - 1]?.focus();
                      }

                      if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) {
                        otpRefs.current[index + 1]?.focus();
                      }
                    }}
                  />
                ))}
              </div>

              <div className="signup-otp-meta">
                <span className="muted tiny">Code expires in {formatTimer(otpMeta.secondsLeft)}</span>
                <button
                  type="button"
                  className="auth-panel-link signup-link-button"
                  onClick={() => requestOtp(true)}
                  disabled={status.loading || otpMeta.secondsLeft > 0}
                >
                  Resend code
                </button>
              </div>

              {otpMeta.devCode ? (
                <div className="booking-confirm" style={{ marginTop: 0 }}>
                  <span className="muted">Local testing code: {otpMeta.devCode}</span>
                </div>
              ) : null}

              <SiteButton className="form-span-2" disabled={status.loading} fullWidth type="submit">
                {status.loading ? "Verifying..." : "Verify"}
              </SiteButton>
            </form>
          ) : null}
        </div>
      )}

      {status.message ? (
        <div className="booking-confirm">
          <span className="muted">{status.message}</span>
        </div>
      ) : null}
    </div>
  );
}
