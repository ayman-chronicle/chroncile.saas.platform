import * as React from "react";
import type { VariantProps } from "class-variance-authority";
import { useResolvedChromeDensity } from "../theme/chrome-style-context";
import { kbdVariants } from "./shadcn";

/**
 * Kbd — a tiny mono key cap, used inline inside buttons and menu rows.
 *   <span>Search</span> <Kbd>⌘</Kbd><Kbd>K</Kbd>
 *
 * Adapts to the surrounding chrome: under `data-chrome="brand"` it uses
 * the editorial surface stack; under `"product"` it uses the Linear
 * `--l-*` wash. Pair with `<Button>` and the command palette.
 */
type KbdVariantProps = VariantProps<typeof kbdVariants>;

export interface KbdProps
  extends React.HTMLAttributes<HTMLSpanElement>, KbdVariantProps {
  /** Display size. `sm` (default, fits inside buttons) or `md`. */
  size?: "sm" | "md";
  /** Force a density flavor. Defaults to whichever the surrounding
   * `ChromeStyleProvider` resolves to. */
  density?: "compact" | "brand";
}

export function Kbd({ size, density: densityProp, className, children, ...props }: KbdProps) {
  const density = useResolvedChromeDensity(densityProp);
  return (
    <span
      className={kbdVariants({ density, size, className })}
      data-density={density}
      {...props}
    >
      {children}
    </span>
  );
}
