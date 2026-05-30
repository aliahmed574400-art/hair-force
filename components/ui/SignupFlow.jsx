"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Logo from "@/components/brand/Logo";
import GoogleAuthButton from "@/components/ui/GoogleAuthButton";
import SiteButton from "@/components/ui/SiteButton";

const OTP_LENGTH = 6;
const DEFAULT_OTP_TTL_SECONDS = 60;
const DASHBOARD_REDIRECT_DELAY_MS = 1800;

function createEmptyOtpDigits() {
  return Array.from({ length: OTP_LENGTH }, () => "");
}

function formatTimer(secondsLeft) {
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function SignupFlow() {
  const router = useRouter();
  const otpRefs = useRef([]);
  const [step, setStep] = useState("landing");
  const [status, setStatus] = useState({ loading: false, message: "" });
  const [emailForm, setEmailForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    termsAccepted: false
  });
  const [phoneForm, setPhoneForm] = useState({ phone: "" });
  const [otpDigits, setOtpDigits] = useState(createEmptyOtpDigits);
  const [otpMeta, setOtpMeta] = useState({
    phone: "",
    secondsLeft: DEFAULT_OTP_TTL_SECONDS,
    devCode: ""
  });

  useEffect(() => {
    if (step !== "otp") {
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

  useEffect(() => {
    if (step !== "success") {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, DASHBOARD_REDIRECT_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [router, step]);

  function moveToStep(nextStep) {
    setStatus({ loading: false, message: "" });
    setStep(nextStep);
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

  async function handleEmailSignup(event) {
    event.preventDefault();

    if (emailForm.password !== emailForm.confirmPassword) {
      setStatus({ loading: false, message: "Passwords do not match." });
      return;
    }

    if (!emailForm.termsAccepted) {
      setStatus({ loading: false, message: "Please accept the terms before creating your account." });
      return;
    }

    setStatus({ loading: true, message: "" });

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: emailForm.name,
          email: emailForm.email,
          password: emailForm.password,
          confirmPassword: emailForm.confirmPassword,
          termsAccepted: emailForm.termsAccepted
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not create your account.");
      }

      setStatus({ loading: false, message: "" });
      setStep("success");
    } catch (error) {
      setStatus({ loading: false, message: error.message });
    }
  }

  async function requestOtp(isResend = false) {
    const phone = String(phoneForm.phone || "").trim();

    if (!phone) {
      setStatus({ loading: false, message: "Enter your phone number first." });
      return;
    }

    setStatus({ loading: true, message: "" });

    try {
      const response = await fetch("/api/auth/phone/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "We could not send the verification code.");
      }

      setOtpDigits(createEmptyOtpDigits());
      setOtpMeta({
        phone: data.phone || phone,
        secondsLeft: Number(data.expiresIn || DEFAULT_OTP_TTL_SECONDS),
        devCode: data.devCode || ""
      });
      setStatus({
        loading: false,
        message: isResend ? "A fresh verification code is ready." : "Enter the code to finish creating your account."
      });
      setStep("otp");
      window.setTimeout(() => otpRefs.current[0]?.focus(), 0);
    } catch (error) {
      setStatus({ loading: false, message: error.message });
    }
  }

  async function handleVerifyOtp(event) {
    event.preventDefault();

    const code = otpDigits.join("");

    if (code.length !== OTP_LENGTH) {
      setStatus({ loading: false, message: `Enter the ${OTP_LENGTH}-digit code to continue.` });
      return;
    }

    setStatus({ loading: true, message: "" });

    try {
      const response = await fetch("/api/auth/phone/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: otpMeta.phone || phoneForm.phone,
          code
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "That code could not be verified.");
      }

      setStatus({ loading: false, message: "" });
      setStep("success");
    } catch (error) {
      setStatus({ loading: false, message: error.message });
    }
  }

  function renderLandingStep() {
    return (
      <>
        <div className="signup-flow-brand">
          <Logo />
        </div>

        <div className="signup-flow-copy">
          <h1>Welcome to Hair Force</h1>
          <p>Book trusted stylists in minutes</p>
        </div>

        <div className="signup-method-stack">
          <GoogleAuthButton
            mode="signup"
            accountRole="client"
            onStatusChange={setStatus}
            showDivider={false}
            showHelperText={false}
            buttonWidth={320}
            className="google-auth-shell-wide"
          />

          <SiteButton
            className="signup-method-button"
            onClick={() => moveToStep("phone")}
            type="button"
            variant="secondary"
          >
            Continue with Phone
          </SiteButton>

          <SiteButton className="signup-method-button" onClick={() => moveToStep("email")} type="button">
            Continue with Email
          </SiteButton>
        </div>

        <div className="signup-flow-links">
          <p>
            Already have an account? <Link href="/signin">Log in</Link>
          </p>
          <p>
            Are you a stylist? <Link href="/vendor/signin">Stylist sign in</Link>
          </p>
        </div>
      </>
    );
  }

  function renderEmailStep() {
    return (
      <>
        <button type="button" className="auth-back-link" onClick={() => moveToStep("landing")}>
          Back
        </button>

        <div className="signup-flow-copy signup-flow-copy-left">
          <span className="eyebrow">Sign up with email</span>
          <h2>Create your account</h2>
          <p>Set up your profile and jump straight into booking once your account is ready.</p>
        </div>

        <form className="form-grid" onSubmit={handleEmailSignup}>
          <div className="form-field form-span-2">
            <label className="form-label" htmlFor="signup-name">
              Full name
            </label>
            <input
              id="signup-name"
              className="form-control"
              placeholder="Full name"
              value={emailForm.name}
              onChange={(event) => setEmailForm({ ...emailForm, name: event.target.value })}
              required
            />
          </div>

          <div className="form-field form-span-2">
            <label className="form-label" htmlFor="signup-email">
              Email
            </label>
            <input
              id="signup-email"
              className="form-control"
              type="email"
              placeholder="Email address"
              value={emailForm.email}
              onChange={(event) => setEmailForm({ ...emailForm, email: event.target.value })}
              required
            />
          </div>

          <div className="form-field form-span-2">
            <label className="form-label" htmlFor="signup-password">
              Password
            </label>
            <input
              id="signup-password"
              className="form-control"
              type="password"
              placeholder="Create a password"
              value={emailForm.password}
              onChange={(event) => setEmailForm({ ...emailForm, password: event.target.value })}
              required
            />
          </div>

          <div className="form-field form-span-2">
            <label className="form-label" htmlFor="signup-confirm-password">
              Confirm password
            </label>
            <input
              id="signup-confirm-password"
              className="form-control"
              type="password"
              placeholder="Confirm your password"
              value={emailForm.confirmPassword}
              onChange={(event) => setEmailForm({ ...emailForm, confirmPassword: event.target.value })}
              required
            />
          </div>

          <label className="signup-checkbox form-span-2" htmlFor="signup-terms">
            <input
              id="signup-terms"
              type="checkbox"
              checked={emailForm.termsAccepted}
              onChange={(event) =>
                setEmailForm({ ...emailForm, termsAccepted: event.target.checked })
              }
            />
            <span>I agree to the terms and account guidelines.</span>
          </label>

          <SiteButton className="form-span-2" disabled={status.loading} fullWidth type="submit">
            {status.loading ? "Creating account..." : "Create account"}
          </SiteButton>
        </form>
      </>
    );
  }

  function renderPhoneStep() {
    return (
      <>
        <button type="button" className="auth-back-link" onClick={() => moveToStep("landing")}>
          Back
        </button>

        <div className="signup-flow-copy signup-flow-copy-left">
          <span className="eyebrow">Sign up with phone</span>
          <h2>Verify your number</h2>
          <p>We&apos;ll text you a one-time code so you can finish creating your Hair Force account.</p>
        </div>

        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            requestOtp(false);
          }}
        >
          <div className="form-field form-span-2">
            <label className="form-label" htmlFor="signup-phone">
              Phone number
            </label>
            <input
              id="signup-phone"
              className="form-control"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={phoneForm.phone}
              onChange={(event) => setPhoneForm({ phone: event.target.value })}
              required
            />
          </div>

          <SiteButton className="form-span-2" disabled={status.loading} fullWidth type="submit">
            {status.loading ? "Sending code..." : "Send OTP"}
          </SiteButton>
        </form>
      </>
    );
  }

  function renderOtpStep() {
    return (
      <>
        <button type="button" className="auth-back-link" onClick={() => moveToStep("phone")}>
          Back
        </button>

        <div className="signup-flow-copy signup-flow-copy-left">
          <span className="eyebrow">OTP verification</span>
          <h2>Enter the verification code</h2>
          <p>We sent a {OTP_LENGTH}-digit code to {otpMeta.phone || phoneForm.phone}.</p>
        </div>

        <form className="signup-otp-form" onSubmit={handleVerifyOtp}>
          <div className="signup-otp-grid">
            {otpDigits.map((digit, index) => (
              <input
                key={`otp-digit-${index}`}
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
      </>
    );
  }

  function renderSuccessStep() {
    return (
      <div className="signup-success-state">
        <div className="signup-flow-brand">
          <Logo />
        </div>
        <div className="signup-success-icon" aria-hidden="true">
          <span />
        </div>
        <div className="signup-flow-copy">
          <h2>Account created successfully</h2>
          <p>Redirecting you to your dashboard now.</p>
        </div>
        <div className="signup-success-bar" aria-hidden="true">
          <span />
        </div>
      </div>
    );
  }

  return (
    <section className="surface signup-flow-shell">
      {step === "landing" ? renderLandingStep() : null}
      {step === "email" ? renderEmailStep() : null}
      {step === "phone" ? renderPhoneStep() : null}
      {step === "otp" ? renderOtpStep() : null}
      {step === "success" ? renderSuccessStep() : null}

      {status.message && step !== "success" ? (
        <div className="booking-confirm">
          <span className="muted">{status.message}</span>
        </div>
      ) : null}
    </section>
  );
}
