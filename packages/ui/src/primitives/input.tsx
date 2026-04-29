"use client";

import * as React from "react";
import type { VariantProps } from "class-variance-authority";

import { useResolvedChromeDensity } from "../theme/chrome-style-context";
import { inputVariants } from "./shadcn";

/**
 * Input is a styled `<input>` with Chronicle density and validation variants.
 * Form wiring is explicit through native `id`, `aria-describedby`, and
 * `aria-invalid` props.
 */

/**
 * Two density flavors:
 *   `"compact"` (default) — Linear-density 28 px h, 13 px sans, ember
 *                            focus halo. Use on product surfaces.
 *   `"brand"`             — 36 px-ish mono input on the brand surface
 *                            stack (`bg-surface-00`). Reach for this on
 *                            marketing forms / auth.
 */
export type InputDensity = "compact" | "brand";

type InputVariantProps = VariantProps<typeof inputVariants>;

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "className">,
    InputVariantProps {
  className?: string;
  density?: InputDensity;
  /** Render a leading search glyph and adjust padding. */
  search?: boolean;
  invalid?: boolean;
  variant?: "default" | "auth";
  /** Wrapper className when `search` is true. */
  wrapperClassName?: string;
  ref?: React.Ref<HTMLInputElement>;
}

export function Input({
  search = false,
  invalid = false,
  density: densityProp,
  variant = "default",
  className,
  wrapperClassName,
  ref,
  ...props
}: InputProps & { ref?: React.Ref<HTMLInputElement> }) {
  const density = useResolvedChromeDensity(densityProp);
  const field = (
    <input
      {...props}
      ref={ref}
      data-density={density}
      data-invalid={invalid || undefined}
      className={inputVariants({ density, variant, search, invalid, className })}
    />
  );

  if (!search) return field;

  return (
    <div className={`relative ${wrapperClassName ?? ""}`}>
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className={
          density === "compact"
            ? "pointer-events-none absolute left-[10px] top-1/2 h-[14px] w-[14px] -translate-y-1/2 text-l-ink-dim"
            : "pointer-events-none absolute left-s-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim"
        }
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
        />
      </svg>
      {field}
    </div>
  );
}
