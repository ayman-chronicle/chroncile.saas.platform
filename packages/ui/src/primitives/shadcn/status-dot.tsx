import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../utils/cn";

export const statusDotVariants = cva(
  "inline-block h-[8px] w-[8px] shrink-0 rounded-full",
  {
    variants: {
      pulse: {
        true: "animate-chron-pulse",
      },
    },
  }
);

export interface ShadcnStatusDotProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusDotVariants> {}

export const ShadcnStatusDot = React.forwardRef<
  HTMLSpanElement,
  ShadcnStatusDotProps
>(({ className, pulse, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(statusDotVariants({ pulse }), className)}
    {...props}
  />
));

ShadcnStatusDot.displayName = "ShadcnStatusDot";
