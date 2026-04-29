import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../utils/cn";

export const labelVariants = cva("inline-flex items-center border", {
  variants: {
    density: {
      compact:
        "gap-[4px] h-[20px] px-[7px] rounded-[10px] bg-l-wash-3 border-l-border text-[11px] font-mono",
      brand:
        "gap-s-1 h-[22px] px-s-2 rounded-pill bg-surface-02 border-hairline-strong font-mono text-mono-xs uppercase tracking-tactical",
    },
    color: {
      neutral: "",
      teal: "text-event-teal",
      amber: "text-event-amber",
      green: "text-event-green",
      orange: "text-event-orange",
      pink: "text-event-pink",
      violet: "text-event-violet",
      ember: "text-ember",
      red: "text-event-red",
    },
  },
  compoundVariants: [
    { density: "compact", color: "neutral", className: "text-l-ink-lo" },
    { density: "brand", color: "neutral", className: "text-ink-lo" },
  ],
  defaultVariants: {
    color: "neutral",
    density: "compact",
  },
});

export const labelDotVariants = cva("rounded-pill bg-current", {
  variants: {
    density: {
      compact: "h-[6px] w-[6px]",
      brand: "h-[6px] w-[6px]",
    },
  },
  defaultVariants: {
    density: "compact",
  },
});

export interface ShadcnLabelProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "color">,
    VariantProps<typeof labelVariants> {
  dot?: boolean;
}

export const ShadcnLabel = React.forwardRef<HTMLSpanElement, ShadcnLabelProps>(
  ({ className, children, color, density, dot = true, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(labelVariants({ color, density }), className)}
      data-color={color}
      data-density={density}
      {...props}
    >
      {dot ? <span className={labelDotVariants({ density })} /> : null}
      {children}
    </span>
  )
);

ShadcnLabel.displayName = "ShadcnLabel";
