import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../utils/cn";

export const tagVariants = cva("inline-flex items-center", {
  variants: {
    density: {
      brand:
        "rounded-xs px-[6px] py-[3px] font-mono text-mono-xs uppercase tracking-eyebrow",
      compact:
        "rounded-l px-[6px] py-[1px] font-sans text-[11px] font-medium leading-[16px]",
    },
    variant: {
      neutral: "bg-surface-02 text-ink-lo",
      teal: "bg-[rgba(45,212,191,0.1)] text-event-teal",
      amber: "bg-[rgba(251,191,36,0.1)] text-event-amber",
      green: "bg-[rgba(74,222,128,0.1)] text-event-green",
      orange: "bg-[rgba(216,107,61,0.1)] text-event-orange",
      pink: "bg-[rgba(244,114,182,0.1)] text-event-pink",
      violet: "bg-[rgba(139,92,246,0.1)] text-event-violet",
      red: "bg-[rgba(239,68,68,0.1)] text-event-red",
      ember: "bg-[rgba(216,67,10,0.1)] text-ember",
    },
  },
  defaultVariants: {
    density: "brand",
    variant: "neutral",
  },
});

export interface ShadcnTagProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof tagVariants> {}

export const ShadcnTag = React.forwardRef<HTMLSpanElement, ShadcnTagProps>(
  ({ className, density, variant, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(tagVariants({ density, variant }), className)}
      data-density={density}
      data-variant={variant}
      {...props}
    />
  )
);

ShadcnTag.displayName = "ShadcnTag";
