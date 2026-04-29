import * as React from "react";
import { useResolvedChromeDensity } from "../theme/chrome-style-context";
import {
  ShadcnBadge,
  type ShadcnBadgeProps,
} from "./shadcn";

/**
 * Badges cover the full event palette plus brand + structural variants.
 * Legacy names (`critical`, `caution`, `nominal`, `data`, `neutral`) still
 * work — they map onto the new tokens so call sites upgrade in place.
 */
export type BadgeVariant =
  | "neutral"
  | "ember"
  | "teal"
  | "amber"
  | "green"
  | "orange"
  | "pink"
  | "violet"
  | "red"
  | "critical"
  | "caution"
  | "nominal"
  | "data";

export type BadgeDensity = "compact" | "brand";

export interface BadgeProps
  extends Omit<ShadcnBadgeProps, "density" | "variant"> {
  variant?: BadgeVariant;
  density?: BadgeDensity;
}

export function Badge({
  variant = "neutral",
  density: densityProp,
  className,
  children,
  ...props
}: BadgeProps) {
  const density = useResolvedChromeDensity(densityProp);
  return (
    <ShadcnBadge
      className={className}
      density={density}
      variant={variant}
      {...props}
    >
      {children}
    </ShadcnBadge>
  );
}
