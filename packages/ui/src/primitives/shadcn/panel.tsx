import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../utils/cn";

export const panelVariants = cva("relative overflow-hidden border", {
  variants: {
    density: {
      brand: "rounded-md",
      compact: "rounded-l",
    },
    elevated: {
      true: "border-hairline-strong bg-surface-02",
      false: "border-hairline bg-surface-01",
    },
    active: {
      true: "before:absolute before:inset-y-0 before:left-0 before:w-[2px] before:bg-ember",
    },
  },
  defaultVariants: {
    density: "brand",
    elevated: false,
  },
});

export const panelHeaderVariants = cva(
  "flex items-center justify-between border-b border-hairline bg-surface-02",
  {
    variants: {
      density: {
        brand: "gap-s-3 px-s-4 py-s-3",
        compact: "gap-[8px] px-[12px] py-[8px]",
      },
    },
    defaultVariants: {
      density: "brand",
    },
  }
);

export const panelHeaderTitleVariants = cva("", {
  variants: {
    density: {
      brand: "font-mono text-mono uppercase tracking-tactical text-ink-lo",
      compact: "font-sans text-[12px] font-medium tracking-normal text-l-ink-lo",
    },
  },
  defaultVariants: {
    density: "brand",
  },
});

export const panelContentVariants = cva("", {
  variants: {
    density: {
      brand: "p-s-4",
      compact: "p-[12px]",
    },
  },
  defaultVariants: {
    density: "brand",
  },
});

export interface ShadcnPanelProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof panelVariants> {}

export const ShadcnPanel = React.forwardRef<HTMLDivElement, ShadcnPanelProps>(
  ({ active, className, density, elevated, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(panelVariants({ active, density, elevated }), className)}
      data-density={density}
      {...props}
    />
  )
);

ShadcnPanel.displayName = "ShadcnPanel";

export interface ShadcnPanelHeaderProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof panelHeaderVariants> {}

export const ShadcnPanelHeader = React.forwardRef<
  HTMLDivElement,
  ShadcnPanelHeaderProps
>(({ className, density, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(panelHeaderVariants({ density }), className)}
    data-density={density}
    {...props}
  />
));

ShadcnPanelHeader.displayName = "ShadcnPanelHeader";

export interface ShadcnPanelContentProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof panelContentVariants> {}

export const ShadcnPanelContent = React.forwardRef<
  HTMLDivElement,
  ShadcnPanelContentProps
>(({ className, density, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(panelContentVariants({ density }), className)}
    data-density={density}
    {...props}
  />
));

ShadcnPanelContent.displayName = "ShadcnPanelContent";
