"use client";

/*
 * Spinner — pure CSS ring. Not an RAC primitive since indeterminate
 * loading UI doesn't need accessibility wiring (aria-busy is usually
 * applied on the parent element). Provide via `ProgressBar` if you need
 * a live-region announcement.
 */

import * as React from "react";
import type { VariantProps } from "class-variance-authority";
import { spinnerVariants } from "./shadcn";

type SpinnerVariantProps = VariantProps<typeof spinnerVariants>;

export interface SpinnerProps
  extends
    Omit<React.HTMLAttributes<HTMLSpanElement>, "role">,
    SpinnerVariantProps {
  /** Accessible label — announced to screen readers via `aria-label`. */
  label?: string;
}

export function Spinner({
  size,
  tone,
  className,
  label = "Loading",
  ...props
}: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={spinnerVariants({ size, tone, className })}
      {...props}
    />
  );
}
