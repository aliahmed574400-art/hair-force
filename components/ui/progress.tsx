import * as React from "react";
import { cn } from "@/lib/utils";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  indicatorClassName?: string;
  value?: number;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, indicatorClassName, value = 0, ...props }, ref) => (
    <div
      ref={ref}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      className={cn("relative h-4 w-full overflow-hidden rounded-full bg-secondary", className)}
      {...props}
    >
      <div
        className={cn("h-full w-full flex-1 rounded-full bg-primary transition-all", indicatorClassName)}
        style={{ transform: `translateX(-${100 - Math.max(0, Math.min(100, value))}%)` }}
      />
    </div>
  )
);
Progress.displayName = "Progress";

export { Progress };
