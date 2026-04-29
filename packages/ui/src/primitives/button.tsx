"use client";

import * as React from "react";
import type { VariantProps } from "class-variance-authority";

import { cn } from "../utils/cn";
import { useResolvedChromeDensity } from "../theme/chrome-style-context";
import {
  buttonIconVariants,
  buttonSpinnerVariants,
  buttonVariants,
} from "./shadcn";

/**
 * Button — two density flavors share one component:
 *
 *   density="compact" (default, Linear-inspired product chrome)
 *     primary   — ember signal CTA
 *     secondary — wash + hairline border
 *     ghost     — label-only, hover surface wash
 *     icon      — square; `children` is the icon
 *     critical  — destructive red
 *
 *   density="brand" (mono-uppercase, marketing/decks)
 *     primary   — high-contrast ink (white-on-black in dark, black-on-bone in light)
 *     secondary — hairline ghost
 *     ember     — brand orange CTA
 *     ghost     — label-only, hover surface
 *     critical  — destructive red
 *
 * Legacy variant names (`data`, `nominal`, `ember` outside brand) keep
 * compiling: they map to the closest Linear-density slot. Existing
 * call-sites stay visually unchanged inside `density="brand"` — the
 * compact density only kicks in when explicitly opted into (or when
 * an app passes `density="compact"` at the surface level).
 */
/**
 * Button variants. The first six are the canonical set:
 *   primary, secondary, ember, ghost, icon, critical
 *
 * `data` and `nominal` are kept for back-compat with older call-sites
 * (they map onto event-color CTAs). Prefer `primary` (compact density)
 * or `ember` (brand density) for the signal CTA going forward.
 *
 * @public
 */
export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ember"
  | "ghost"
  | "icon"
  | "critical"
  /** @deprecated Use `primary` (compact) or a custom event-colored Badge. */
  | "data"
  /** @deprecated Use `primary` (compact) or a custom event-colored Badge. */
  | "nominal";

export type ButtonSize = "sm" | "md" | "lg";
export type ButtonDensity = "compact" | "brand";

type ButtonVariantProps = VariantProps<typeof buttonVariants>;

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children" | "disabled">,
    ButtonVariantProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /**
   * Density flavor.
   *   `"compact"` (default) — Linear-inspired product chrome.
   *   `"brand"` — mono-uppercase editorial buttons; reach for this on
   *               marketing pages, decks, and brand surfaces.
   */
  density?: ButtonDensity;
  /** Loading state. Disables the button and swaps the leading icon for a spinner. */
  isLoading?: boolean;
  /** RAC-compatible pending alias. */
  isPending?: boolean;
  disabled?: boolean;
  /** RAC-compatible disabled alias. */
  isDisabled?: boolean;
  /** RAC-compatible press handler alias for existing call sites. */
  onPress?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  /** String className for the root. */
  className?: string;
  /** Optional per-slot overrides. Each is appended after the base slot class. */
  classNames?: { base?: string; icon?: string; spinner?: string };
  children?: React.ReactNode;
  ref?: React.Ref<HTMLButtonElement>;
}

export function Button({
  variant = "secondary",
  size = "md",
  density: densityProp,
  isLoading,
  isPending,
  disabled,
  isDisabled,
  onClick,
  onPress,
  className,
  classNames,
  type,
  leadingIcon,
  trailingIcon,
  children,
  ref,
  ...rest
}: ButtonProps) {
  const density = useResolvedChromeDensity(densityProp);
  const pending = Boolean(isLoading ?? isPending);
  const disabledResolved = Boolean((disabled ?? isDisabled) || pending);

  return (
    <button
      {...rest}
      ref={ref}
      type={type ?? "button"}
      disabled={disabledResolved}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) onPress?.(event);
      }}
      data-variant={variant}
      data-density={density}
      data-disabled={disabledResolved || undefined}
      data-pending={pending || undefined}
      className={cn(
        buttonVariants({ variant, size, density }),
        classNames?.base,
        className
      )}
    >
      {pending ? (
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          className={cn(buttonSpinnerVariants(), classNames?.spinner)}
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="2"
            className="opacity-25"
          />
          <path
            d="M4 12a8 8 0 018-8"
            stroke="currentColor"
            strokeWidth="2"
            className="opacity-75"
          />
        </svg>
      ) : leadingIcon ? (
        <span className={cn(buttonIconVariants(), classNames?.icon)}>
          {leadingIcon}
        </span>
      ) : null}
      {children}
      {!pending && trailingIcon ? (
        <span className={cn(buttonIconVariants(), classNames?.icon)}>
          {trailingIcon}
        </span>
      ) : null}
    </button>
  );
}
