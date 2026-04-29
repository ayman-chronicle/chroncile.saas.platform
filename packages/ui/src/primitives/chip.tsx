"use client";

import * as React from "react";
import type { VariantProps } from "class-variance-authority";
import { useResolvedChromeDensity } from "../theme/chrome-style-context";
import {
  chipCountVariants,
  chipRemoveVariants,
  chipVariants,
} from "./shadcn";

/**
 * Chip — Linear-density filter chip / dropdown trigger. Sits in the
 * filter bar above tables and timelines:
 *   <Chip icon={<TriangleIcon/>} count={2}>Outcome</Chip>
 *
 * Activates with an ember tint when a value is applied. `removable`
 * surfaces a small × on the right so a trailing click-handler can
 * clear the chip without needing a separate button next to it.
 */
export type ChipDensity = "compact" | "brand";

type ChipVariantProps = VariantProps<typeof chipVariants>;

export interface ChipProps
  extends
    Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children">,
    ChipVariantProps {
  icon?: React.ReactNode;
  /** Optional count badge rendered after the label. */
  count?: React.ReactNode;
  /** When true, render a trailing × that fires `onRemove` (stops bubbling). */
  removable?: boolean;
  onRemove?: () => void;
  active?: boolean;
  density?: ChipDensity;
  children?: React.ReactNode;
}

const RemoveIcon = () => (
  <svg
    width="10"
    height="10"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    aria-hidden
  >
    <path d="M4 4l8 8M12 4l-8 8" />
  </svg>
);

export function Chip({
  icon,
  count,
  removable,
  onRemove,
  active,
  density: densityProp,
  className,
  children,
  ...props
}: ChipProps) {
  const density = useResolvedChromeDensity(densityProp);
  return (
    <button
      type="button"
      className={chipVariants({ active, density, className })}
      data-active={active || undefined}
      data-density={density}
      {...props}
    >
      {icon ? <span className="shrink-0">{icon}</span> : null}
      {children ? <span>{children}</span> : null}
      {count !== undefined ? (
        <span className={chipCountVariants({ density })}>{count}</span>
      ) : null}
      {removable ? (
        <span
          role="button"
          tabIndex={-1}
          aria-label="Remove filter"
          className={chipRemoveVariants({ density })}
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
        >
          <RemoveIcon />
        </span>
      ) : null}
    </button>
  );
}
