import * as React from "react";
import { useResolvedChromeDensity } from "../theme/chrome-style-context";
import {
  ShadcnLabel,
  type ShadcnLabelProps,
} from "./shadcn";

/**
 * Label — a colored pill with a leading dot. Used to tag rows by
 * domain (`teal` = intercom / support, `amber` = shopify / commerce,
 * `green` = stripe / billing, `pink` = slack, `violet` = sandbox,
 * `ember` = hot signal, `red` = divergence).
 *
 * Distinct from `<Tag>` (which is a brand-density chip) and `<Badge>`
 * (which carries semantic state). Reach for `<Label>` when you want
 * the dot-as-key encoding, like Linear's labels.
 */
export type LabelColor =
  | "neutral"
  | "teal"
  | "amber"
  | "green"
  | "orange"
  | "pink"
  | "violet"
  | "ember"
  | "red";

export type LabelDensity = "compact" | "brand";

export interface LabelProps
  extends Omit<ShadcnLabelProps, "color" | "density"> {
  color?: LabelColor;
  density?: LabelDensity;
  /** When false, hide the leading dot. Defaults to true. */
  dot?: boolean;
}

export function Label({
  color = "neutral",
  density: densityProp,
  dot = true,
  className,
  children,
  ...props
}: LabelProps) {
  const density = useResolvedChromeDensity(densityProp);
  return (
    <ShadcnLabel
      className={className}
      color={color}
      density={density}
      dot={dot}
      {...props}
    >
      {children}
    </ShadcnLabel>
  );
}
