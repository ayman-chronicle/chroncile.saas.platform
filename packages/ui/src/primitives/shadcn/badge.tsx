import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../utils/cn";

export const badgeVariants = cva("inline-flex items-center border", {
  variants: {
    density: {
      brand:
        "gap-s-2 rounded-xs px-s-2 py-[3px] font-mono text-mono-sm uppercase tracking-tactical",
      compact:
        "gap-[4px] rounded-l px-[6px] py-[1px] font-sans text-[11px] font-medium leading-[16px]",
    },
    variant: {
      neutral: "border-hairline-strong bg-surface-02 text-ink-lo",
      ember: "border-ember/40 bg-[rgba(216,67,10,0.08)] text-ember",
      teal: "border-event-teal/40 bg-[rgba(45,212,191,0.1)] text-event-teal",
      amber: "border-event-amber/40 bg-[rgba(251,191,36,0.1)] text-event-amber",
      green: "border-event-green/40 bg-[rgba(74,222,128,0.1)] text-event-green",
      orange: "border-event-orange/40 bg-[rgba(216,107,61,0.1)] text-event-orange",
      pink: "border-event-pink/40 bg-[rgba(244,114,182,0.1)] text-event-pink",
      violet: "border-event-violet/40 bg-[rgba(139,92,246,0.1)] text-event-violet",
      red: "border-event-red/40 bg-[rgba(239,68,68,0.1)] text-event-red",
      critical: "border-event-red/40 bg-[rgba(239,68,68,0.1)] text-event-red",
      caution: "border-event-amber/40 bg-[rgba(251,191,36,0.1)] text-event-amber",
      nominal: "border-event-green/40 bg-[rgba(74,222,128,0.1)] text-event-green",
      data: "border-event-teal/40 bg-[rgba(45,212,191,0.1)] text-event-teal",
    },
  },
  defaultVariants: {
    density: "brand",
    variant: "neutral",
  },
});

export interface ShadcnBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const ShadcnBadge = React.forwardRef<HTMLSpanElement, ShadcnBadgeProps>(
  ({ className, density, variant, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(badgeVariants({ density, variant }), className)}
      data-density={density}
      data-variant={variant}
      {...props}
    />
  )
);

ShadcnBadge.displayName = "ShadcnBadge";
