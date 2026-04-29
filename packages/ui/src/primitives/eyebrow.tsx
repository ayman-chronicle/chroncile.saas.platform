import * as React from "react";
import { useResolvedChromeDensity } from "../theme/chrome-style-context";
import { eyebrowVariants } from "./shadcn";

/**
 * Eyebrow — the tactical uppercase mono label used above section headers
 * and inside panels. The one ubiquitous chrome element of the system.
 *
 * Nested `<b>` is auto-highlighted with the high-ink color + medium
 * weight, so the auth-flow pattern works out of the box:
 *
 *   <Eyebrow><b>SIGN IN</b> · CHRONICLE</Eyebrow>
 */
export type EyebrowDensity = "compact" | "brand";

export interface EyebrowProps extends React.HTMLAttributes<HTMLSpanElement> {
  as?: "span" | "div" | "p";
  density?: EyebrowDensity;
}

export function Eyebrow({
  as: Tag = "span",
  density: densityProp,
  className,
  children,
  ...props
}: EyebrowProps) {
  const density = useResolvedChromeDensity(densityProp);
  return (
    <Tag
      className={eyebrowVariants({ density, className })}
      data-density={density}
      {...props}
    >
      {children}
    </Tag>
  );
}
