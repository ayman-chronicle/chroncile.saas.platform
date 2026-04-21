"use client";

/*
 * NativeSelect is the previous `Select` implementation preserved for
 * back-compat: a styled `<select>` with `<option>` children. Use this for
 * quick forms that don't need search/typeahead/custom rendering. For
 * anything richer, use the RAC-based `Select` compound in `./select`.
 */

import * as React from "react";
import { cx } from "../utils/cx";

export interface NativeSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
  variant?: "default" | "auth";
}

export const NativeSelect = React.forwardRef<
  HTMLSelectElement,
  NativeSelectProps
>(function NativeSelect(
  { invalid = false, variant = "default", className, children, ...props },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cx(
          "w-full appearance-none rounded-sm border bg-surface-00 px-s-3 py-s-2 pr-[32px] font-mono text-mono-lg text-ink transition-colors duration-fast ease-out focus:outline-none",
          variant === "auth"
            ? "bg-transparent border-hairline-strong text-ink-hi focus:border-ink-hi"
            : invalid
              ? "border-event-red focus:border-event-red"
              : "border-hairline-strong hover:border-ink-dim focus:border-ember",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="pointer-events-none absolute right-s-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m19.5 8.25-7.5 7.5-7.5-7.5"
        />
      </svg>
    </div>
  );
});
