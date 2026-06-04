"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import GoogleAuthButton from "@/components/ui/GoogleAuthButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PhoneSigninPanel from "@/components/ui/PhoneSigninPanel";
import VendorSigninHeroSlider from "@/components/ui/vendor-signin-hero-slider";
import { cn } from "@/lib/utils";
import { ArrowRight, Eye, EyeOff, Sparkles } from "lucide-react";

interface PupilProps {
  size?: number;
  maxDistance?: number;
  pupilColor?: string;
  forceLookX?: number;
  forceLookY?: number;
}

const Pupil = ({
  size = 12,
  maxDistance = 5,
  pupilColor = "black",
  forceLookX,
  forceLookY
}: PupilProps) => {
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const pupilRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setMouseX(event.clientX);
      setMouseY(event.clientY);
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  const calculatePupilPosition = () => {
    if (!pupilRef.current) {
      return { x: 0, y: 0 };
    }

    if (forceLookX !== undefined && forceLookY !== undefined) {
      return { x: forceLookX, y: forceLookY };
    }

    const pupil = pupilRef.current.getBoundingClientRect();
    const pupilCenterX = pupil.left + pupil.width / 2;
    const pupilCenterY = pupil.top + pupil.height / 2;
    const deltaX = mouseX - pupilCenterX;
    const deltaY = mouseY - pupilCenterY;
    const distance = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2), maxDistance);
    const angle = Math.atan2(deltaY, deltaX);

    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance
    };
  };

  const pupilPosition = calculatePupilPosition();

  return (
    <div
      ref={pupilRef}
      className="rounded-full"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: pupilColor,
        transform: `translate(${pupilPosition.x}px, ${pupilPosition.y}px)`,
        transition: "transform 0.1s ease-out"
      }}
    />
  );
};

interface EyeBallProps {
  size?: number;
  pupilSize?: number;
  maxDistance?: number;
  eyeColor?: string;
  pupilColor?: string;
  isBlinking?: boolean;
  forceLookX?: number;
  forceLookY?: number;
}

const EyeBall = ({
  size = 48,
  pupilSize = 16,
  maxDistance = 10,
  eyeColor = "white",
  pupilColor = "black",
  isBlinking = false,
  forceLookX,
  forceLookY
}: EyeBallProps) => {
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const eyeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setMouseX(event.clientX);
      setMouseY(event.clientY);
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  const calculatePupilPosition = () => {
    if (!eyeRef.current) {
      return { x: 0, y: 0 };
    }

    if (forceLookX !== undefined && forceLookY !== undefined) {
      return { x: forceLookX, y: forceLookY };
    }

    const eye = eyeRef.current.getBoundingClientRect();
    const eyeCenterX = eye.left + eye.width / 2;
    const eyeCenterY = eye.top + eye.height / 2;
    const deltaX = mouseX - eyeCenterX;
    const deltaY = mouseY - eyeCenterY;
    const distance = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2), maxDistance);
    const angle = Math.atan2(deltaY, deltaX);

    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance
    };
  };

  const pupilPosition = calculatePupilPosition();

  return (
    <div
      ref={eyeRef}
      className="flex items-center justify-center rounded-full transition-all duration-150"
      style={{
        width: `${size}px`,
        height: isBlinking ? "2px" : `${size}px`,
        backgroundColor: eyeColor,
        overflow: "hidden"
      }}
    >
      {!isBlinking ? (
        <div
          className="rounded-full"
          style={{
            width: `${pupilSize}px`,
            height: `${pupilSize}px`,
            backgroundColor: pupilColor,
            transform: `translate(${pupilPosition.x}px, ${pupilPosition.y}px)`,
            transition: "transform 0.1s ease-out"
          }}
        />
      ) : null}
    </div>
  );
};

function getCharacterPosition(
  ref: React.RefObject<HTMLDivElement | null>,
  mouseX: number,
  mouseY: number
) {
  if (!ref.current) {
    return { faceX: 0, faceY: 0, bodySkew: 0 };
  }

  const rect = ref.current.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 3;
  const deltaX = mouseX - centerX;
  const deltaY = mouseY - centerY;

  return {
    faceX: Math.max(-15, Math.min(15, deltaX / 20)),
    faceY: Math.max(-10, Math.min(10, deltaY / 30)),
    bodySkew: Math.max(-6, Math.min(6, -deltaX / 120))
  };
}

function isProviderError(message: string) {
  const lower = message.toLowerCase();

  return ["failed", "error", "not configured", "could not", "required"].some((token) =>
    lower.includes(token)
  );
}

interface ProviderStatus {
  loading: boolean;
  message: string;
  tone?: "error" | "info";
}

interface AnimatedCharactersLoginPageProps {
  audience?: "client" | "vendor";
  vendorHeroSlides?: Array<{
    id: string;
    src: string;
    alt: string;
    photographer: string;
    photographerUrl?: string;
    pexelsUrl?: string;
  }>;
}

const VENDOR_ALLOWED_ROLES = ["vendor", "admin"];

function AnimatedCharactersLoginPage({
  audience = "client",
  vendorHeroSlides = []
}: AnimatedCharactersLoginPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect") || "";
  const saveStylistParam = searchParams.get("saveStylist") || "";
  const isVendorAudience = audience === "vendor";
  const allowedRoles = isVendorAudience ? VENDOR_ALLOWED_ROLES : undefined;
  const googleAccountRole = isVendorAudience ? "vendor" : "client";
  const badgeText = isVendorAudience ? "Stylist sign in" : "Sign in";
  const pageTitle = isVendorAudience ? "Open your stylist dashboard" : "Welcome back";
  const pageDescription = isVendorAudience
    ? "Sign in to manage services, availability, bookings, and your Hair Force vendor dashboard."
    : "Open your Hair Force account to manage bookings, favorites, rebooks, and dashboard access.";
  const emailPlaceholder = isVendorAudience ? "vendor@hairforce.app" : "client@hairforce.app";
  const showSignUpPrompt = true;
  const signUpPrompt = "Don't have an account?";
  const signUpHref = isVendorAudience ? "/vendor/signup" : "/signup";
  const signUpLabel = isVendorAudience ? "Create stylist account" : "Sign Up";
  const altPrompt = isVendorAudience ? "Already have a stylist account?" : "Are you a stylist?";
  const altHref = isVendorAudience ? "/vendor/signin" : "/vendor/signin";
  const altLabel = isVendorAudience ? "Sign in" : "Stylist sign in";
  const successNameFallback = isVendorAudience ? "stylist" : "client";

  function getPostLoginHref(userRole?: string) {
    if (redirectParam) {
      const separator = redirectParam.includes("?") ? "&" : "?";
      const qs = saveStylistParam ? `${separator}saveStylist=${encodeURIComponent(saveStylistParam)}` : "";
      return `${redirectParam}${qs}`;
    }
    return userRole === "admin" ? "/admin" : "/dashboard";
  }
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberFor30Days, setRememberFor30Days] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const [isPurpleBlinking, setIsPurpleBlinking] = useState(false);
  const [isBlackBlinking, setIsBlackBlinking] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isLookingAtEachOther, setIsLookingAtEachOther] = useState(false);
  const [isPurplePeeking, setIsPurplePeeking] = useState(false);
  const purpleRef = useRef<HTMLDivElement>(null);
  const blackRef = useRef<HTMLDivElement>(null);
  const yellowRef = useRef<HTMLDivElement>(null);
  const orangeRef = useRef<HTMLDivElement>(null);
  const forgotPasswordHref = email
    ? `/forgot-password?email=${encodeURIComponent(email)}`
    : "/forgot-password";

  useEffect(() => {
    if (isVendorAudience) {
      return undefined;
    }

    const handleMouseMove = (event: MouseEvent) => {
      setMouseX(event.clientX);
      setMouseY(event.clientY);
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [isVendorAudience]);

  useEffect(() => {
    if (isVendorAudience) {
      return undefined;
    }

    const getRandomBlinkInterval = () => Math.random() * 4000 + 3000;

    const scheduleBlink = () =>
      window.setTimeout(() => {
        setIsPurpleBlinking(true);
        window.setTimeout(() => {
          setIsPurpleBlinking(false);
          scheduleBlink();
        }, 150);
      }, getRandomBlinkInterval());

    const timeoutId = scheduleBlink();

    return () => window.clearTimeout(timeoutId);
  }, [isVendorAudience]);

  useEffect(() => {
    if (isVendorAudience) {
      return undefined;
    }

    const getRandomBlinkInterval = () => Math.random() * 4000 + 3000;

    const scheduleBlink = () =>
      window.setTimeout(() => {
        setIsBlackBlinking(true);
        window.setTimeout(() => {
          setIsBlackBlinking(false);
          scheduleBlink();
        }, 150);
      }, getRandomBlinkInterval());

    const timeoutId = scheduleBlink();

    return () => window.clearTimeout(timeoutId);
  }, [isVendorAudience]);

  useEffect(() => {
    if (isVendorAudience) {
      setIsLookingAtEachOther(false);
      return undefined;
    }

    if (!isTyping) {
      setIsLookingAtEachOther(false);
      return undefined;
    }

    setIsLookingAtEachOther(true);
    const timeoutId = window.setTimeout(() => {
      setIsLookingAtEachOther(false);
    }, 800);

    return () => window.clearTimeout(timeoutId);
  }, [isTyping, isVendorAudience]);

  useEffect(() => {
    if (isVendorAudience) {
      setIsPurplePeeking(false);
      return undefined;
    }

    if (!(password.length > 0 && showPassword)) {
      setIsPurplePeeking(false);
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setIsPurplePeeking(true);
      window.setTimeout(() => {
        setIsPurplePeeking(false);
      }, 800);
    }, Math.random() * 3000 + 2000);

    return () => window.clearTimeout(timeoutId);
  }, [password, showPassword, isPurplePeeking, isVendorAudience]);

  const purplePos = getCharacterPosition(purpleRef, mouseX, mouseY);
  const blackPos = getCharacterPosition(blackRef, mouseX, mouseY);
  const yellowPos = getCharacterPosition(yellowRef, mouseX, mouseY);
  const orangePos = getCharacterPosition(orangeRef, mouseX, mouseY);

  function handleProviderStatus(nextStatus: ProviderStatus) {
    if (nextStatus.loading && !nextStatus.message) {
      setError("");
      setStatusMessage("");
      return;
    }

    if (!nextStatus.message) {
      return;
    }

    if (nextStatus.tone === "error" || isProviderError(nextStatus.message)) {
      setError(nextStatus.message);
      setStatusMessage("");
      return;
    }

    setError("");
    setStatusMessage(nextStatus.message);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatusMessage("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          rememberFor30Days,
          allowedRoles
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Invalid email or password. Please try again.");
      }

      setStatusMessage(`Welcome back, ${data.user?.name || successNameFallback}. Redirecting now...`);

      const nextHref = getPostLoginHref(data.user?.role);
      router.push(nextHref);
      router.refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not sign you in.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.08fr_0.92fr]">
      <div
        className={cn(
          "relative hidden overflow-hidden text-primary-foreground lg:flex lg:flex-col",
          isVendorAudience
            ? "h-screen bg-[#081327]"
            : "justify-between bg-gradient-to-br from-primary via-[#3158c9] to-[#2344a1] p-12"
        )}
      >
        <div className="relative z-20 space-y-8">
          {isVendorAudience ? (
            <VendorSigninHeroSlider slides={vendorHeroSlides} />
          ) : (
            <div className="flex h-[500px] items-end justify-center">
              <div className="relative h-[400px] w-[550px]">
                <div
                  ref={purpleRef}
                  className="absolute bottom-0 transition-all duration-700 ease-in-out"
                  style={{
                    left: "70px",
                    width: "180px",
                    height: isTyping || (password.length > 0 && !showPassword) ? "440px" : "400px",
                    backgroundColor: "#6C3FF5",
                    borderRadius: "10px 10px 0 0",
                    zIndex: 1,
                    transform:
                      password.length > 0 && showPassword
                        ? "skewX(0deg)"
                        : isTyping || (password.length > 0 && !showPassword)
                          ? `skewX(${purplePos.bodySkew - 12}deg) translateX(40px)`
                          : `skewX(${purplePos.bodySkew}deg)`,
                    transformOrigin: "bottom center"
                  }}
                >
                  <div
                    className="absolute flex gap-8 transition-all duration-700 ease-in-out"
                    style={{
                      left:
                        password.length > 0 && showPassword
                          ? "20px"
                          : isLookingAtEachOther
                            ? "55px"
                            : `${45 + purplePos.faceX}px`,
                      top:
                        password.length > 0 && showPassword
                          ? "35px"
                          : isLookingAtEachOther
                            ? "65px"
                            : `${40 + purplePos.faceY}px`
                    }}
                  >
                    <EyeBall
                      size={18}
                      pupilSize={7}
                      maxDistance={5}
                      eyeColor="white"
                      pupilColor="#2D2D2D"
                      isBlinking={isPurpleBlinking}
                      forceLookX={
                        password.length > 0 && showPassword
                          ? isPurplePeeking
                            ? 4
                            : -4
                          : isLookingAtEachOther
                            ? 3
                            : undefined
                      }
                      forceLookY={
                        password.length > 0 && showPassword
                          ? isPurplePeeking
                            ? 5
                            : -4
                          : isLookingAtEachOther
                            ? 4
                            : undefined
                      }
                    />
                    <EyeBall
                      size={18}
                      pupilSize={7}
                      maxDistance={5}
                      eyeColor="white"
                      pupilColor="#2D2D2D"
                      isBlinking={isPurpleBlinking}
                      forceLookX={
                        password.length > 0 && showPassword
                          ? isPurplePeeking
                            ? 4
                            : -4
                          : isLookingAtEachOther
                            ? 3
                            : undefined
                      }
                      forceLookY={
                        password.length > 0 && showPassword
                          ? isPurplePeeking
                            ? 5
                            : -4
                          : isLookingAtEachOther
                            ? 4
                            : undefined
                      }
                    />
                  </div>
                </div>

                <div
                  ref={blackRef}
                  className="absolute bottom-0 transition-all duration-700 ease-in-out"
                  style={{
                    left: "240px",
                    width: "120px",
                    height: "310px",
                    backgroundColor: "#2D2D2D",
                    borderRadius: "8px 8px 0 0",
                    zIndex: 2,
                    transform:
                      password.length > 0 && showPassword
                        ? "skewX(0deg)"
                        : isLookingAtEachOther
                          ? `skewX(${blackPos.bodySkew * 1.5 + 10}deg) translateX(20px)`
                          : isTyping || (password.length > 0 && !showPassword)
                            ? `skewX(${blackPos.bodySkew * 1.5}deg)`
                            : `skewX(${blackPos.bodySkew}deg)`,
                    transformOrigin: "bottom center"
                  }}
                >
                  <div
                    className="absolute flex gap-6 transition-all duration-700 ease-in-out"
                    style={{
                      left:
                        password.length > 0 && showPassword
                          ? "10px"
                          : isLookingAtEachOther
                            ? "32px"
                            : `${26 + blackPos.faceX}px`,
                      top:
                        password.length > 0 && showPassword
                          ? "28px"
                          : isLookingAtEachOther
                            ? "12px"
                            : `${32 + blackPos.faceY}px`
                    }}
                  >
                    <EyeBall
                      size={16}
                      pupilSize={6}
                      maxDistance={4}
                      eyeColor="white"
                      pupilColor="#2D2D2D"
                      isBlinking={isBlackBlinking}
                      forceLookX={
                        password.length > 0 && showPassword
                          ? -4
                          : isLookingAtEachOther
                            ? 0
                            : undefined
                      }
                      forceLookY={
                        password.length > 0 && showPassword
                          ? -4
                          : isLookingAtEachOther
                            ? -4
                            : undefined
                      }
                    />
                    <EyeBall
                      size={16}
                      pupilSize={6}
                      maxDistance={4}
                      eyeColor="white"
                      pupilColor="#2D2D2D"
                      isBlinking={isBlackBlinking}
                      forceLookX={
                        password.length > 0 && showPassword
                          ? -4
                          : isLookingAtEachOther
                            ? 0
                            : undefined
                      }
                      forceLookY={
                        password.length > 0 && showPassword
                          ? -4
                          : isLookingAtEachOther
                            ? -4
                            : undefined
                      }
                    />
                  </div>
                </div>

                <div
                  ref={orangeRef}
                  className="absolute bottom-0 transition-all duration-700 ease-in-out"
                  style={{
                    left: "0px",
                    width: "240px",
                    height: "200px",
                    zIndex: 3,
                    backgroundColor: "#FF9B6B",
                    borderRadius: "120px 120px 0 0",
                    transform:
                      password.length > 0 && showPassword
                        ? "skewX(0deg)"
                        : `skewX(${orangePos.bodySkew}deg)`,
                    transformOrigin: "bottom center"
                  }}
                >
                  <div
                    className="absolute flex gap-8 transition-all duration-200 ease-out"
                    style={{
                      left:
                        password.length > 0 && showPassword
                          ? "50px"
                          : `${82 + orangePos.faceX}px`,
                      top:
                        password.length > 0 && showPassword
                          ? "85px"
                          : `${90 + orangePos.faceY}px`
                    }}
                  >
                    <Pupil
                      size={12}
                      maxDistance={5}
                      pupilColor="#2D2D2D"
                      forceLookX={password.length > 0 && showPassword ? -5 : undefined}
                      forceLookY={password.length > 0 && showPassword ? -4 : undefined}
                    />
                    <Pupil
                      size={12}
                      maxDistance={5}
                      pupilColor="#2D2D2D"
                      forceLookX={password.length > 0 && showPassword ? -5 : undefined}
                      forceLookY={password.length > 0 && showPassword ? -4 : undefined}
                    />
                  </div>
                </div>

                <div
                  ref={yellowRef}
                  className="absolute bottom-0 transition-all duration-700 ease-in-out"
                  style={{
                    left: "310px",
                    width: "140px",
                    height: "230px",
                    backgroundColor: "#E8D754",
                    borderRadius: "70px 70px 0 0",
                    zIndex: 4,
                    transform:
                      password.length > 0 && showPassword
                        ? "skewX(0deg)"
                        : `skewX(${yellowPos.bodySkew}deg)`,
                    transformOrigin: "bottom center"
                  }}
                >
                  <div
                    className="absolute flex gap-6 transition-all duration-200 ease-out"
                    style={{
                      left:
                        password.length > 0 && showPassword
                          ? "20px"
                          : `${52 + yellowPos.faceX}px`,
                      top:
                        password.length > 0 && showPassword
                          ? "35px"
                          : `${40 + yellowPos.faceY}px`
                    }}
                  >
                    <Pupil
                      size={12}
                      maxDistance={5}
                      pupilColor="#2D2D2D"
                      forceLookX={password.length > 0 && showPassword ? -5 : undefined}
                      forceLookY={password.length > 0 && showPassword ? -4 : undefined}
                    />
                    <Pupil
                      size={12}
                      maxDistance={5}
                      pupilColor="#2D2D2D"
                      forceLookX={password.length > 0 && showPassword ? -5 : undefined}
                      forceLookY={password.length > 0 && showPassword ? -4 : undefined}
                    />
                  </div>
                  <div
                    className="absolute h-[4px] w-20 rounded-full bg-[#2D2D2D] transition-all duration-200 ease-out"
                    style={{
                      left:
                        password.length > 0 && showPassword
                          ? "10px"
                          : `${40 + yellowPos.faceX}px`,
                      top:
                        password.length > 0 && showPassword
                          ? "88px"
                          : `${88 + yellowPos.faceY}px`
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {!isVendorAudience ? (
          <>
            <div className="relative z-20 flex items-center gap-8 text-sm text-white/60">
              <Link href="/" className="transition-colors hover:text-white">
                Privacy Policy
              </Link>
              <Link href="/" className="transition-colors hover:text-white">
                Terms of Service
              </Link>
              <Link href="/vendor/signin" className="transition-colors hover:text-white">
                Stylist sign in
              </Link>
            </div>

            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:28px_28px] opacity-30" />
            <div className="pointer-events-none absolute right-24 top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
            <div className="pointer-events-none absolute bottom-10 left-10 h-96 w-96 rounded-full bg-[#93c5fd]/10 blur-3xl" />
          </>
        ) : null}
      </div>

      <div className="flex min-h-screen bg-background lg:min-h-full">
        <div className="flex min-h-full w-full flex-col justify-between px-6 py-6 sm:px-10 sm:py-8">
          <div className="mb-8 flex items-center justify-center gap-3 text-lg font-semibold text-foreground lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <span>Hair Force</span>
          </div>

          <div className="mb-6 rounded-none border-0 bg-transparent p-0 shadow-none backdrop-blur-none">
            <div className="mb-6 text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-primary/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-primary">
                {badgeText}
              </span>
              <h1 className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-foreground">
                {pageTitle}
              </h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {pageDescription}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={emailPlaceholder}
                  value={email}
                  autoComplete="email"
                  onChange={(event) => setEmail(event.target.value)}
                  onFocus={() => setIsTyping(true)}
                  onBlur={() => setIsTyping(false)}
                  required
                  className="h-12 border-border/80 bg-white px-4 shadow-sm focus-visible:ring-primary/30"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    autoComplete="current-password"
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    className="h-12 border-border/80 bg-white px-4 pr-12 shadow-sm focus-visible:ring-primary/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-700"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="remember"
                    checked={rememberFor30Days}
                    onCheckedChange={(checked) => setRememberFor30Days(Boolean(checked))}
                  />
                  <Label
                    htmlFor="remember"
                    className="cursor-pointer text-sm font-normal text-muted-foreground"
                  >
                    Remember me
                  </Label>
                </div>
                <a
                  href={forgotPasswordHref}
                  className="text-sm font-semibold underline underline-offset-4"
                  style={{ color: "#000000" }}
                >
                  Forgot password?
                </a>
              </div>

              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              ) : null}

              {statusMessage ? (
                <div
                  className={cn(
                    "rounded-2xl border px-4 py-3 text-sm",
                    "border-blue-200 bg-blue-50 text-blue-700"
                  )}
                >
                  {statusMessage}
                </div>
              ) : null}

              <Button
                type="submit"
                className="h-12 w-full rounded-xl text-base font-medium shadow-lg shadow-blue-500/15"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Log in"}
              </Button>
            </form>

            <div className="mt-6">
              <div className="mb-4 flex items-center gap-4">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                  Or continue with
                </span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <div className="space-y-3">
                <GoogleAuthButton
                  mode="signin"
                  accountRole={googleAccountRole}
                  allowedRoles={allowedRoles}
                  onStatusChange={handleProviderStatus}
                  showDivider={false}
                  showHelperText={false}
                  buttonWidth={380}
                  className="google-auth-shell-wide"
                  redirectTo={getPostLoginHref()}
                />

                <PhoneSigninPanel
                  allowedRoles={allowedRoles}
                  className="phone-auth-shell-tight"
                  successNameFallback={successNameFallback}
                  redirectTo={getPostLoginHref()}
                />
              </div>
            </div>

            {showSignUpPrompt ? (
              <div className="mt-6 text-center text-sm text-muted-foreground">
                {signUpPrompt}{" "}
                <Link href={signUpHref} className="font-medium text-foreground hover:underline">
                  {signUpLabel}
                </Link>
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <span>{altPrompt}</span>
            <Link
              href={altHref}
              className="inline-flex items-center gap-1 font-medium text-foreground transition-colors hover:text-primary"
            >
              {altLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export const Component = AnimatedCharactersLoginPage;

export default AnimatedCharactersLoginPage;
