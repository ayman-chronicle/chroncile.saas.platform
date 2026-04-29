"use client";

import * as React from "react";
import { useResolvedChromeDensity } from "../theme/chrome-style-context";
import {
  orDividerLabelVariants,
  orDividerLineVariants,
  orDividerRootVariants,
} from "./shadcn";

/*
 * OrDivider — labeled hairline used between SSO and email forms:
 *
 *   <OrDivider />                             // "or continue with email"
 *   <OrDivider label="or sign up with email" />
 *
 * Renders a centered mono uppercase label flanked by hairlines. Pure
 * presentation — no role / aria.
 */

export type OrDividerDensity = "compact" | "brand";

export interface OrDividerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Center label. Defaults to "or continue with email". Pass `null` for a bare hairline. */
  label?: React.ReactNode;
  density?: OrDividerDensity;
}

/**
 * Hairline divider with a centered "or" label — the visual break
 * between SSO and email-password sign-in.
 */
export function OrDivider({
  label = "or continue with email",
  density: densityProp,
  className,
  ...rest
}: OrDividerProps) {
  const density = useResolvedChromeDensity(densityProp);
  return (
    <div
      className={orDividerRootVariants({ density, className })}
      data-density={density}
      aria-hidden
      {...rest}
    >
      <span className={orDividerLineVariants({ density })} />
      {label != null ? (
        <span className={orDividerLabelVariants({ density })}>{label}</span>
      ) : null}
      <span className={orDividerLineVariants({ density })} />
    </div>
  );
}
