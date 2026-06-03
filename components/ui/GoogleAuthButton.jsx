"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
const GOOGLE_BUTTON_BASE_HEIGHT = 40;
const GOOGLE_BUTTON_TARGET_HEIGHT = 56;
const GOOGLE_BUTTON_SCALE = GOOGLE_BUTTON_TARGET_HEIGHT / GOOGLE_BUTTON_BASE_HEIGHT;

function GoogleGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48">
      <path
        fill="#FFC107"
        d="M43.6 20.1H42V20H24v8h11.3A12 12 0 0 1 24 36a12 12 0 1 1 7.9-21l5.7-5.7A20 20 0 1 0 44 24c0-1.3-.1-2.7-.4-3.9Z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8A12 12 0 0 1 24 12c3.1 0 5.9 1.2 7.9 3l5.7-5.7A19.9 19.9 0 0 0 24 4 20 20 0 0 0 6.3 14.7Z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.1 0 9.8-1.9 13.4-5.2l-6.2-5.2A11.9 11.9 0 0 1 24 36c-5.2 0-9.6-3.3-11.2-8l-6.5 5A20 20 0 0 0 24 44Z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.1H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C41.1 35.4 44 30.2 44 24c0-1.3-.1-2.7-.4-3.9Z"
      />
    </svg>
  );
}

export default function GoogleAuthButton({
  mode = "signin",
  onStatusChange,
  showDivider = true,
  showHelperText = true,
  buttonWidth = 320,
  accountRole = "client",
  allowedRoles,
  className = "",
  redirectTo = ""
}) {
  const shellRef = useRef(null);
  const buttonRef = useRef(null);
  const router = useRouter();
  const [isScriptReady, setIsScriptReady] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resolvedButtonWidth, setResolvedButtonWidth] = useState(
    Math.floor(buttonWidth / GOOGLE_BUTTON_SCALE)
  );
  const isSignup = mode === "signup";

  useEffect(() => {
    const shellElement = shellRef.current;

    if (!shellElement) {
      return undefined;
    }

    const updateButtonWidth = () => {
      const nextWidth = Math.floor(shellElement.getBoundingClientRect().width);

      if (!nextWidth) {
        return;
      }

      setResolvedButtonWidth(Math.floor(nextWidth / GOOGLE_BUTTON_SCALE));
    };

    updateButtonWidth();

    if (typeof ResizeObserver === "undefined") {
      return undefined;
    }

    const resizeObserver = new ResizeObserver(() => updateButtonWidth());
    resizeObserver.observe(shellElement);

    return () => resizeObserver.disconnect();
  }, [buttonWidth]);

  useEffect(() => {
    if (
      !isScriptReady ||
      !GOOGLE_CLIENT_ID ||
      !buttonRef.current ||
      !window.google?.accounts?.id ||
      !resolvedButtonWidth
    ) {
      return;
    }

    async function handleGoogleCredentialResponse(googleResponse) {
      if (!googleResponse?.credential) {
        return;
      }

      setLoading(true);
      setError("");
      onStatusChange?.({ loading: true, message: "", tone: "info" });

      try {
        const response = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            credential: googleResponse.credential,
            allowedRoles,
            accountRole
          })
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Google sign in failed.");
        }

        const nextHref = redirectTo || (data.user?.role === "admin" ? "/admin" : "/dashboard");

        onStatusChange?.({
          loading: false,
          tone: "info",
          message: isSignup
            ? "Google account connected. Redirecting to your dashboard..."
            : `Welcome back, ${data.user.name || "client"}.`
        });

        router.push(nextHref);
        router.refresh();
      } catch (nextError) {
        const message = nextError.message || "Google sign in failed.";
        console.error("[GoogleAuth] fetch error:", nextError);
        setError(message);
        onStatusChange?.({ loading: false, message, tone: "error" });
      } finally {
        setLoading(false);
      }
    }

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCredentialResponse,
      ux_mode: "popup",
      context: isSignup ? "signup" : "signin",
      auto_select: false,
      cancel_on_tap_outside: true
    });

    buttonRef.current.innerHTML = "";
    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: "outline",
      size: "large",
      shape: "pill",
      text: "continue_with",
      width: resolvedButtonWidth,
      logo_alignment: "left"
    });
  }, [accountRole, allowedRoles, isScriptReady, isSignup, onStatusChange, redirectTo, resolvedButtonWidth, router]);

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={() => setIsScriptReady(true)}
      />

      {showDivider ? (
        <div className="auth-divider" aria-hidden="true">
          <span>{isSignup ? "Or create an account with" : "Or continue with"}</span>
        </div>
      ) : null}

      <div ref={shellRef} className={`google-auth-shell ${loading ? "is-busy" : ""} ${className}`.trim()}>
        {GOOGLE_CLIENT_ID ? (
          <>
            <div className="google-auth-surface" aria-hidden="true">
              <span className="google-auth-brand">
                <GoogleGlyph />
              </span>
              <span className="google-auth-label">Continue with Google</span>
            </div>
            <div ref={buttonRef} className="google-auth-button" />
          </>
        ) : (
          <button type="button" className="google-auth-fallback" disabled>
            <span className="google-auth-brand">
              <GoogleGlyph />
            </span>
            <span className="google-auth-label">Continue with Google</span>
          </button>
        )}
      </div>

      {showHelperText ? (
        <p className="tiny muted" style={{ margin: "10px 0 0" }}>
          {GOOGLE_CLIENT_ID
            ? accountRole === "vendor"
              ? "We'll create or reopen your stylist account using your verified Google email."
              : "We'll create or reopen your client account using your verified Google email."
            : "Add GOOGLE_CLIENT_ID and NEXT_PUBLIC_GOOGLE_CLIENT_ID to enable Google authentication."}
        </p>
      ) : null}

      {!onStatusChange && error ? (
        <div className="booking-confirm">
          <span className="muted">{error}</span>
        </div>
      ) : null}
    </>
  );
}
