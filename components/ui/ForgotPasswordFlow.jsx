"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Logo from "@/components/brand/Logo";
import SiteButton from "@/components/ui/SiteButton";

const OTP_LENGTH = 6;
const DEFAULT_OTP_TTL_SECONDS = 60;
const SIGNIN_REDIRECT_DELAY_MS = 1800;

function createEmptyOtpDigits() {
  return Array.from({ length: OTP_LENGTH }, () => "");
}

function formatTimer(secondsLeft) {
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function ForgotPasswordFlow({ initialEmail = "" }) {
  const router = useRouter();
  const otpRefs = useRef([]);
  const autoRequestedRef = useRef(false);
  const [step, setStep] = useState("request");
  const [status, setStatus] = useState({ loading: false, message: "" });
  const [email, setEmail] = useState(String(initialEmail || "").trim().toLowerCase());
  const [otpDigits, setOtpDigits] = useState(createEmptyOtpDigits);
  const [otpMeta, setOtpMeta] = useState({
    email: String(initialEmail || "").trim().toLowerCase(),
    secondsLeft: DEFAULT_OTP_TTL_SECONDS
  });
  const [resetMeta, setResetMeta] = useState({
    email: String(initialEmail || "").trim().toLowerCase(),
    resetToken: ""
  });
  const [passwordForm, setPasswordForm] = useState({
    password: "",
    confirmPassword: ""
  });

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

  useEffect(() => {
    if (step !== "success") {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      router.push("/signin");
      router.refresh();
    }, SIGNIN_REDIRECT_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [router, step]);

  useEffect(() => {
    const nextEmail = String(initialEmail || "").trim().toLowerCase();

    if (!nextEmail || autoRequestedRef.current) {
      return;
    }

    autoRequestedRef.current = true;
    setEmail(nextEmail);
    requestOtp({ emailOverride: nextEmail, autoRequested: true });
  }, [initialEmail]);

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

  async function requestOtp({ emailOverride, isResend = false, autoRequested = false } = {}) {
    const nextEmail = String(emailOverride ?? email).trim().toLowerCase();

    if (!nextEmail) {
      setStatus({ loading: false, message: "Enter your email first." });
      return;
    }

    setStatus({ loading: true, message: "" });

    try {
      const response = await fetch("/api/auth/password-reset/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: nextEmail })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "We could not send the verification code.");
      }

      const verifiedEmail = String(data.email || nextEmail).trim().toLowerCase();
      setEmail(verifiedEmail);
      setOtpDigits(createEmptyOtpDigits());
      setOtpMeta({
        email: verifiedEmail,
        secondsLeft: Number(data.expiresIn || DEFAULT_OTP_TTL_SECONDS)
      });
      setResetMeta({
        email: verifiedEmail,
        resetToken: ""
      });
      setPasswordForm({
        password: "",
        confirmPassword: ""
      });
      setStep("verify");
      setStatus({
        loading: false,
        message: isResend
          ? "A fresh verification code is ready."
          : autoRequested
            ? "Enter the code we sent to your email."
            : "Enter the code we sent to your email."
      });
      window.setTimeout(() => otpRefs.current[0]?.focus(), 0);
    } catch (error) {
      setStep("request");
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
      const response = await fetch("/api/auth/password-reset/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: otpMeta.email || email,
          code
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "That code could not be verified.");
      }

      setResetMeta({
        email: String(data.email || otpMeta.email || email).trim().toLowerCase(),
        resetToken: data.resetToken || ""
      });
      setPasswordForm({
        password: "",
        confirmPassword: ""
      });
      setStatus({ loading: false, message: "" });
      setStep("reset");
    } catch (error) {
      setStatus({ loading: false, message: error.message });
    }
  }

  async function handleResetPassword(event) {
    event.preventDefault();

    if (passwordForm.password !== passwordForm.confirmPassword) {
      setStatus({ loading: false, message: "Passwords do not match." });
      return;
    }

    setStatus({ loading: true, message: "" });

    try {
      const response = await fetch("/api/auth/password-reset/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: resetMeta.email || email,
          resetToken: resetMeta.resetToken,
          password: passwordForm.password,
          confirmPassword: passwordForm.confirmPassword
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "We could not update your password.");
      }

      setStatus({ loading: false, message: "" });
      setStep("success");
    } catch (error) {
      setStatus({ loading: false, message: error.message });
    }
  }

  function renderRequestStep() {
    return (
      <>
        <div className="signup-flow-brand">
          <Logo />
        </div>

        <div className="signup-flow-copy">
          <h1>Reset your password</h1>
          <p>Enter the email linked to your Hair Force account and we&apos;ll send a 6-digit code.</p>
        </div>

        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            requestOtp();
          }}
        >
          <div className="form-field form-span-2">
            <label className="form-label" htmlFor="forgot-password-email">
              Email address
            </label>
            <input
              id="forgot-password-email"
              className="form-control"
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <SiteButton className="form-span-2" disabled={status.loading} fullWidth type="submit">
            {status.loading ? "Sending code..." : "Send OTP"}
          </SiteButton>
        </form>

        <div className="signup-flow-links">
          <p>
            Remembered your password? <Link href="/signin">Back to sign in</Link>
          </p>
          <p>
            Need an account? <Link href="/signup">Create one</Link>
          </p>
        </div>
      </>
    );
  }

  function renderVerifyStep() {
    return (
      <>
        <button type="button" className="auth-back-link" onClick={() => moveToStep("request")}>
          Back
        </button>

        <div className="signup-flow-copy signup-flow-copy-left">
          <span className="eyebrow">Email verification</span>
          <h2>Enter the OTP</h2>
          <p>Use the {OTP_LENGTH}-digit code we sent to your email address.</p>
        </div>

        <div className="password-reset-email">{otpMeta.email || email}</div>

        <form className="signup-otp-form" onSubmit={handleVerifyOtp}>
          <div className="signup-otp-grid">
            {otpDigits.map((digit, index) => (
              <input
                key={`reset-otp-${index}`}
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
              onClick={() => requestOtp({ isResend: true, emailOverride: otpMeta.email || email })}
              disabled={status.loading || otpMeta.secondsLeft > 0}
            >
              Resend code
            </button>
          </div>

          <SiteButton className="form-span-2" disabled={status.loading} fullWidth type="submit">
            {status.loading ? "Verifying..." : "Verify"}
          </SiteButton>
        </form>
      </>
    );
  }

  function renderResetStep() {
    return (
      <>
        <button type="button" className="auth-back-link" onClick={() => moveToStep("verify")}>
          Back
        </button>

        <div className="signup-flow-copy signup-flow-copy-left">
          <span className="eyebrow">Create new password</span>
          <h2>Set a new password</h2>
          <p>Create a fresh password for your Hair Force account, then use it next time you sign in.</p>
        </div>

        <div className="password-reset-email">{resetMeta.email || email}</div>

        <form className="form-grid" onSubmit={handleResetPassword}>
          <div className="form-field form-span-2">
            <label className="form-label" htmlFor="new-password">
              Create new password
            </label>
            <input
              id="new-password"
              className="form-control"
              type="password"
              placeholder="Create new password"
              value={passwordForm.password}
              onChange={(event) =>
                setPasswordForm({ ...passwordForm, password: event.target.value })
              }
              required
            />
          </div>

          <div className="form-field form-span-2">
            <label className="form-label" htmlFor="confirm-new-password">
              Re-enter new password
            </label>
            <input
              id="confirm-new-password"
              className="form-control"
              type="password"
              placeholder="Re-enter new password"
              value={passwordForm.confirmPassword}
              onChange={(event) =>
                setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })
              }
              required
            />
          </div>

          <SiteButton className="form-span-2" disabled={status.loading} fullWidth type="submit">
            {status.loading ? "Updating password..." : "Update password"}
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
          <h2>Password updated successfully</h2>
          <p>Redirecting you back to sign in now.</p>
        </div>
        <div className="signup-success-bar" aria-hidden="true">
          <span />
        </div>
      </div>
    );
  }

  return (
    <section className="surface signup-flow-shell password-reset-shell">
      {step === "request" ? renderRequestStep() : null}
      {step === "verify" ? renderVerifyStep() : null}
      {step === "reset" ? renderResetStep() : null}
      {step === "success" ? renderSuccessStep() : null}

      {status.message && step !== "success" ? (
        <div className="booking-confirm">
          <span className="muted">{status.message}</span>
        </div>
      ) : null}
    </section>
  );
}
