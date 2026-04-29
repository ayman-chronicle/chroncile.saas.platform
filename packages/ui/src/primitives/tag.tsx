import * as React from "react";
import { useResolvedChromeDensity } from "../theme/chrome-style-context";
import { ShadcnTag, type ShadcnTagProps } from "./shadcn";

/**
 * Tag — the tighter, label-style pill used on events and roles
 * (CUSTOMER / AGENT / SYSTEM / DIVERGENCE). Smaller than Badge, no border.
 */
export type TagVariant =
  | "neutral"
  | "teal"
  | "amber"
  | "green"
  | "orange"
  | "pink"
  | "violet"
  | "red"
  | "ember";

export type TagDensity = "compact" | "brand";

export interface TagProps extends Omit<ShadcnTagProps, "density" | "variant"> {
  variant?: TagVariant;
  density?: TagDensity;
}

export function Tag({
  variant = "neutral",
  density: densityProp,
  className,
  children,
  ...props
}: TagProps) {
  const density = useResolvedChromeDensity(densityProp);
  return (
    <ShadcnTag
      className={className}
      density={density}
      variant={variant}
      {...props}
    >
      {children}
    </ShadcnTag>
  );
}
