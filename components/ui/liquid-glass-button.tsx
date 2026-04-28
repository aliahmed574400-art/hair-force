"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold tracking-[-0.01em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200/70 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border border-white/30 bg-[linear-gradient(145deg,rgba(255,255,255,0.28)_0%,rgba(255,255,255,0.08)_28%,rgba(255,255,255,0.02)_100%),linear-gradient(135deg,rgba(86,103,247,0.96)_0%,rgba(72,148,255,0.96)_52%,rgba(103,202,255,0.94)_100%)] text-white shadow-[0_18px_34px_rgba(55,98,216,0.24)] hover:brightness-[1.05]",
        destructive:
          "border border-rose-300/60 bg-[linear-gradient(135deg,rgba(248,113,113,0.96),rgba(220,38,38,0.92))] text-white shadow-[0_18px_30px_rgba(220,38,38,0.22)] hover:brightness-[1.05]",
        cool:
          "border border-white/30 bg-[linear-gradient(145deg,rgba(255,255,255,0.28)_0%,rgba(255,255,255,0.08)_28%,rgba(255,255,255,0.02)_100%),linear-gradient(135deg,rgba(86,103,247,0.96)_0%,rgba(72,148,255,0.96)_52%,rgba(103,202,255,0.94)_100%)] text-white shadow-[0_18px_34px_rgba(55,98,216,0.24)] ring-1 ring-white/20 hover:brightness-[1.05]",
        outline:
          "border border-[#c5d9ff]/80 bg-white/75 text-[#24427d] shadow-[0_14px_30px_rgba(148,163,184,0.12)] hover:bg-white/90",
        secondary:
          "border border-[#c5d9ff]/70 bg-[linear-gradient(145deg,rgba(255,255,255,0.92),rgba(238,244,255,0.76)),linear-gradient(135deg,rgba(231,239,255,0.96),rgba(215,229,255,0.84)_54%,rgba(202,222,255,0.72)_100%)] text-[#24427d] shadow-[0_16px_30px_rgba(131,160,210,0.18)] hover:brightness-[1.02]",
        ghost: "bg-transparent text-[#51688f] hover:bg-white/55 hover:text-[#173064]",
        link: "rounded-none bg-transparent px-0 text-[#2b5fff] shadow-none hover:underline"
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 px-4 text-xs",
        lg: "h-12 px-7",
        icon: "h-11 w-11 rounded-full p-0"
      }
    },
    defaultVariants: {
      variant: "cool",
      size: "default"
    }
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, className, variant, size, asChild = false, ...props }, ref) => {
    const resolvedClassName = cn(buttonVariants({ variant, size, className }))

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, {
        ...props,
        className: cn(resolvedClassName, children.props.className),
      })
    }

    return (
      <button
        className={resolvedClassName}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    )
  }
)
Button.displayName = "Button"

const liquidbuttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold tracking-[-0.01em] transition-[transform,filter,box-shadow,color,background-color] duration-300 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200/70",
  {
    variants: {
      variant: {
        default:
          "border border-white/30 bg-[linear-gradient(145deg,rgba(255,255,255,0.28)_0%,rgba(255,255,255,0.08)_28%,rgba(255,255,255,0.02)_100%),linear-gradient(135deg,rgba(86,103,247,0.96)_0%,rgba(72,148,255,0.96)_52%,rgba(103,202,255,0.94)_100%)] text-white shadow-[0_18px_34px_rgba(55,98,216,0.24)] hover:scale-[1.02] hover:brightness-[1.05] active:scale-[0.985]",
        destructive:
          "border border-rose-300/60 bg-[linear-gradient(135deg,rgba(248,113,113,0.96),rgba(220,38,38,0.92))] text-white shadow-[0_18px_30px_rgba(220,38,38,0.22)] hover:scale-[1.02] hover:brightness-[1.05] active:scale-[0.985]",
        outline:
          "border border-[#c5d9ff]/80 bg-white/75 text-[#24427d] shadow-[0_14px_30px_rgba(148,163,184,0.12)] hover:scale-[1.02] hover:bg-white/90 active:scale-[0.985]",
        secondary:
          "border border-[#c5d9ff]/70 bg-[linear-gradient(145deg,rgba(255,255,255,0.92),rgba(238,244,255,0.76)),linear-gradient(135deg,rgba(231,239,255,0.96),rgba(215,229,255,0.84)_54%,rgba(202,222,255,0.72)_100%)] text-[#24427d] shadow-[0_16px_30px_rgba(131,160,210,0.18)] hover:scale-[1.02] hover:brightness-[1.02] active:scale-[0.985]",
        ghost:
          "bg-transparent text-[#51688f] shadow-none hover:scale-[1.02] hover:bg-white/55 hover:text-[#173064] active:scale-[0.985]",
        link: "rounded-none bg-transparent px-0 text-[#2b5fff] shadow-none hover:underline"
      },
      size: {
        default: "h-11 px-5 py-2 has-[>svg]:px-4",
        sm: "h-9 gap-1.5 px-4 text-xs has-[>svg]:px-3.5",
        lg: "h-12 px-6 has-[>svg]:px-5",
        xl: "h-12 px-7 has-[>svg]:px-5.5",
        xxl: "h-14 px-10 text-base has-[>svg]:px-7",
        icon: "size-11"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "xl"
    }
  }
)

function LiquidButton({
  className,
  variant,
  size,
  asChild = false,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof liquidbuttonVariants> & {
    asChild?: boolean
  }) {
  const filterId = React.useId().replace(/:/g, "")
  const surfaceClassName = cn(
    "relative isolate overflow-hidden rounded-full",
    liquidbuttonVariants({ variant, size, className })
  )
  const content = asChild && React.isValidElement(children) ? children.props.children : children

  const chrome = (
    <>
      <div
        className="pointer-events-none absolute inset-0 z-0 rounded-full shadow-[0_0_6px_rgba(0,0,0,0.03),0_2px_6px_rgba(0,0,0,0.08),inset_3px_3px_0.5px_-3px_rgba(255,255,255,0.22),inset_-3px_-3px_0.5px_-3px_rgba(255,255,255,0.16),inset_1px_1px_1px_-0.5px_rgba(255,255,255,0.26),inset_-1px_-1px_1px_-0.5px_rgba(255,255,255,0.16),inset_0_0_6px_6px_rgba(255,255,255,0.1),inset_0_0_2px_2px_rgba(255,255,255,0.06)]"
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-full"
        style={{
          backdropFilter: `url("#${filterId}")`,
          WebkitBackdropFilter: `url("#${filterId}")`
        }}
      />
      <div className="pointer-events-none absolute inset-[1px] rounded-full bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.36),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.18),transparent_60%)] opacity-80" />
      <div className="relative z-10 flex items-center gap-2">{content}</div>
      <GlassFilter id={filterId} />
    </>
  )

  if (asChild) {
    if (!React.isValidElement(children)) {
      return null
    }

    return React.cloneElement(children, {
      ...props,
      "data-slot": "button",
      className: cn(surfaceClassName, children.props.className),
      children: chrome
    })
  }

  return (
    <button
      data-slot="button"
      className={surfaceClassName}
      {...props}
    >
      {chrome}
    </button>
  )
}

function GlassFilter({ id }: { id: string }) {
  return (
    <svg className="hidden" aria-hidden="true">
      <defs>
        <filter
          id={id}
          x="0%"
          y="0%"
          width="100%"
          height="100%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.05 0.05"
            numOctaves="1"
            seed="1"
            result="turbulence"
          />
          <feGaussianBlur in="turbulence" stdDeviation="2" result="blurredNoise" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="blurredNoise"
            scale="70"
            xChannelSelector="R"
            yChannelSelector="B"
            result="displaced"
          />
          <feGaussianBlur in="displaced" stdDeviation="4" result="finalBlur" />
          <feComposite in="finalBlur" in2="finalBlur" operator="over" />
        </filter>
      </defs>
    </svg>
  )
}

type ColorVariant =
  | "default"
  | "primary"
  | "success"
  | "error"
  | "gold"
  | "bronze"

interface MetalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ColorVariant
}

const colorVariants: Record<
  ColorVariant,
  {
    outer: string
    inner: string
    button: string
    textColor: string
    textShadow: string
  }
> = {
  default: {
    outer: "bg-gradient-to-b from-[#000] to-[#A0A0A0]",
    inner: "bg-gradient-to-b from-[#FAFAFA] via-[#3E3E3E] to-[#E5E5E5]",
    button: "bg-gradient-to-b from-[#B9B9B9] to-[#969696]",
    textColor: "text-white",
    textShadow: "[text-shadow:_0_-1px_0_rgb(80_80_80_/_100%)]"
  },
  primary: {
    outer: "bg-gradient-to-b from-[#173064] to-[#98B9FF]",
    inner: "bg-gradient-to-b from-[#F3F7FF] via-[#3557D8] to-[#D9E5FF]",
    button: "bg-gradient-to-b from-[#5D7EFF] to-[#75C6FF]",
    textColor: "text-white",
    textShadow: "[text-shadow:_0_-1px_0_rgb(30_58_138_/_100%)]"
  },
  success: {
    outer: "bg-gradient-to-b from-[#005A43] to-[#7CCB9B]",
    inner: "bg-gradient-to-b from-[#E5F8F0] via-[#00352F] to-[#D1F0E6]",
    button: "bg-gradient-to-b from-[#9ADBC8] to-[#3E8F7C]",
    textColor: "text-[#FFF7F0]",
    textShadow: "[text-shadow:_0_-1px_0_rgb(6_78_59_/_100%)]"
  },
  error: {
    outer: "bg-gradient-to-b from-[#5A0000] to-[#FFAEB0]",
    inner: "bg-gradient-to-b from-[#FFDEDE] via-[#680002] to-[#FFE9E9]",
    button: "bg-gradient-to-b from-[#F08D8F] to-[#A45253]",
    textColor: "text-[#FFF7F0]",
    textShadow: "[text-shadow:_0_-1px_0_rgb(146_64_14_/_100%)]"
  },
  gold: {
    outer: "bg-gradient-to-b from-[#917100] to-[#EAD98F]",
    inner: "bg-gradient-to-b from-[#FFFDDD] via-[#856807] to-[#FFF1B3]",
    button: "bg-gradient-to-b from-[#FFEBA1] to-[#9B873F]",
    textColor: "text-[#FFFDE5]",
    textShadow: "[text-shadow:_0_-1px_0_rgb(178_140_2_/_100%)]"
  },
  bronze: {
    outer: "bg-gradient-to-b from-[#864813] to-[#E9B486]",
    inner: "bg-gradient-to-b from-[#EDC5A1] via-[#5F2D01] to-[#FFDEC1]",
    button: "bg-gradient-to-b from-[#FFE3C9] to-[#A36F3D]",
    textColor: "text-[#FFF7F0]",
    textShadow: "[text-shadow:_0_-1px_0_rgb(124_45_18_/_100%)]"
  }
}

const metalButtonVariants = (
  variant: ColorVariant = "default",
  isPressed: boolean,
  isHovered: boolean,
  isTouchDevice: boolean
) => {
  const colors = colorVariants[variant]
  const transitionStyle = "all 250ms cubic-bezier(0.1, 0.4, 0.2, 1)"

  return {
    wrapper: cn(
      "relative inline-flex transform-gpu rounded-md p-[1.25px] will-change-transform",
      colors.outer
    ),
    wrapperStyle: {
      transform: isPressed
        ? "translateY(2.5px) scale(0.99)"
        : "translateY(0) scale(1)",
      boxShadow: isPressed
        ? "0 1px 2px rgba(0, 0, 0, 0.15)"
        : isHovered && !isTouchDevice
          ? "0 4px 12px rgba(0, 0, 0, 0.12)"
          : "0 3px 8px rgba(0, 0, 0, 0.08)",
      transition: transitionStyle,
      transformOrigin: "center center"
    },
    inner: cn(
      "absolute inset-[1px] transform-gpu rounded-lg will-change-transform",
      colors.inner
    ),
    innerStyle: {
      transition: transitionStyle,
      transformOrigin: "center center",
      filter:
        isHovered && !isPressed && !isTouchDevice ? "brightness(1.05)" : "none"
    },
    button: cn(
      "relative z-10 m-[1px] inline-flex h-11 transform-gpu cursor-pointer items-center justify-center overflow-hidden rounded-md px-6 py-2 text-sm font-semibold leading-none will-change-transform outline-none",
      colors.button,
      colors.textColor,
      colors.textShadow
    ),
    buttonStyle: {
      transform: isPressed ? "scale(0.97)" : "scale(1)",
      transition: transitionStyle,
      transformOrigin: "center center",
      filter:
        isHovered && !isPressed && !isTouchDevice ? "brightness(1.02)" : "none"
    }
  }
}

const ShineEffect = ({ isPressed }: { isPressed: boolean }) => {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-20 overflow-hidden transition-opacity duration-300",
        isPressed ? "opacity-20" : "opacity-0"
      )}
    >
      <div className="absolute inset-0 rounded-md bg-gradient-to-r from-transparent via-neutral-100 to-transparent" />
    </div>
  )
}

const MetalButton = React.forwardRef<HTMLButtonElement, MetalButtonProps>(
  ({ children, className, variant = "default", ...props }, ref) => {
    const [isPressed, setIsPressed] = React.useState(false)
    const [isHovered, setIsHovered] = React.useState(false)
    const [isTouchDevice, setIsTouchDevice] = React.useState(false)

    React.useEffect(() => {
      setIsTouchDevice("ontouchstart" in window || navigator.maxTouchPoints > 0)
    }, [])

    const buttonText = children || "Button"
    const variants = metalButtonVariants(
      variant,
      isPressed,
      isHovered,
      isTouchDevice
    )

    const handleInternalMouseDown = () => {
      setIsPressed(true)
    }
    const handleInternalMouseUp = () => {
      setIsPressed(false)
    }
    const handleInternalMouseLeave = () => {
      setIsPressed(false)
      setIsHovered(false)
    }
    const handleInternalMouseEnter = () => {
      if (!isTouchDevice) {
        setIsHovered(true)
      }
    }
    const handleInternalTouchStart = () => {
      setIsPressed(true)
    }
    const handleInternalTouchEnd = () => {
      setIsPressed(false)
    }
    const handleInternalTouchCancel = () => {
      setIsPressed(false)
    }

    return (
      <div className={variants.wrapper} style={variants.wrapperStyle}>
        <div className={variants.inner} style={variants.innerStyle}></div>
        <button
          ref={ref}
          className={cn(variants.button, className)}
          style={variants.buttonStyle}
          {...props}
          onMouseDown={handleInternalMouseDown}
          onMouseUp={handleInternalMouseUp}
          onMouseLeave={handleInternalMouseLeave}
          onMouseEnter={handleInternalMouseEnter}
          onTouchStart={handleInternalTouchStart}
          onTouchEnd={handleInternalTouchEnd}
          onTouchCancel={handleInternalTouchCancel}
        >
          <ShineEffect isPressed={isPressed} />
          {buttonText}
          {isHovered && !isPressed && !isTouchDevice && (
            <div className="pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-t from-transparent to-white/5" />
          )}
        </button>
      </div>
    )
  }
)

MetalButton.displayName = "MetalButton"

export {
  Button,
  buttonVariants,
  liquidbuttonVariants,
  LiquidButton,
  MetalButton
}
