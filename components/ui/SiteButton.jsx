"use client";

import Link from "next/link";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { cn } from "@/lib/utils";

const variantMap = {
  primary: "default",
  secondary: "secondary",
  outline: "outline",
  ghost: "ghost",
  destructive: "destructive",
  link: "link"
};

const sizeMap = {
  sm: "sm",
  default: "lg",
  lg: "xxl",
  xl: "xxl"
};

export default function SiteButton({
  href,
  variant = "primary",
  size = "default",
  className = "",
  fullWidth = false,
  children,
  ...props
}) {
  const resolvedVariant = variantMap[variant] || variantMap.primary;
  const resolvedSize = sizeMap[size] || size;
  const sharedClassName = cn(
    "font-semibold tracking-[-0.01em]",
    variant === "secondary" || variant === "outline" ? "!text-[#173064]" : "",
    fullWidth ? "w-full" : "",
    className
  );

  if (href) {
    return (
      <LiquidButton asChild variant={resolvedVariant} size={resolvedSize} className={sharedClassName}>
        <Link href={href} {...props}>
          {children}
        </Link>
      </LiquidButton>
    );
  }

  return (
    <LiquidButton variant={resolvedVariant} size={resolvedSize} className={sharedClassName} {...props}>
      {children}
    </LiquidButton>
  );
}
