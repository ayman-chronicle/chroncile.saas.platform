"use client";

import * as React from "react";
import {
  Button as RACButton,
  type ButtonProps as RACButtonProps,
} from "react-aria-components/Button";

import { tv, type VariantProps } from "../utils/tv";
import { composeTwRenderProps } from "../utils/compose";

/**
 * Button variants follow the handoff's three roles:
 *   - primary  — high-contrast ink button (white-on-black in dark, black-on-bone in light)
 *   - secondary — hairline-bordered ghost with ink text
 *   - ember    — the one "hot" affordance (brand gradient call-to-action)
 *   - ghost    — label-only, hover surface
 *   - critical — destructive red (failure/deploy-block)
 *
 * `data` and `nominal` are legacy aliases kept so older call-sites still
 * compile. Remove them once every consumer has migrated.
 */
export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ember"
  | "ghost"
  | "critical"
  | "data"
  | "nominal";

export type ButtonSize = "sm" | "md" | "lg";

const button = tv({
  slots: {
    base:
      "inline-flex items-center justify-center gap-s-2 font-mono uppercase " +
      "tracking-tactical rounded-xs border " +
      "transition-[background-color,color,border-color,transform] duration-fast ease-out " +
      "data-[focus-visible=true]:outline-none data-[focus-visible=true]:ring-1 " +
      "data-[focus-visible=true]:ring-ember data-[focus-visible=true]:ring-offset-1 " +
      "data-[focus-visible=true]:ring-offset-page " +
      "data-[pressed=true]:translate-y-[1px] " +
      "data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-40 " +
      "data-[pending=true]:cursor-wait",
    icon: "shrink-0",
    spinner: "h-4 w-4 shrink-0 animate-spin",
  },
  variants: {
    variant: {
      primary:
        "border-transparent text-[color:var(--c-btn-invert-fg)] " +
        "[background:var(--c-btn-invert-bg)] " +
        "data-[hovered=true]:[background:var(--c-ink-hi)] " +
        "data-[hovered=true]:text-[color:var(--c-btn-invert-fg)]",
      secondary:
        "border-hairline-strong bg-transparent text-ink-lo " +
        "data-[hovered=true]:text-ink-hi data-[hovered=true]:border-ink-dim",
      ember:
        "border-transparent bg-ember text-white data-[hovered=true]:bg-ember-deep",
      ghost:
        "border-transparent bg-transparent text-ink-lo " +
        "data-[hovered=true]:bg-surface-03 data-[hovered=true]:text-ink-hi",
      critical:
        "border-transparent bg-event-red text-white data-[hovered=true]:brightness-110",
      data:
        "border-transparent bg-event-teal text-black data-[hovered=true]:brightness-110",
      nominal:
        "border-transparent bg-event-green text-black data-[hovered=true]:brightness-110",
    },
    size: {
      sm: "h-[28px] px-s-3 text-mono-sm",
      md: "h-[36px] px-s-4 text-mono",
      lg: "h-[44px] px-s-5 text-mono-lg",
    },
  },
  defaultVariants: { variant: "secondary", size: "md" },
});

type ButtonVariantProps = VariantProps<typeof button>;

export interface ButtonProps
  extends Omit<RACButtonProps, "className" | "children">,
    ButtonVariantProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Alias for RAC's `isPending`. Both work; `isLoading` wins if both passed. */
  isLoading?: boolean;
  /** Alias for RAC's `isDisabled`. Both work; `disabled` wins if both passed. */
  disabled?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  /** String className for the root. RAC render-prop function form is unused; callers should use `classNames` for per-slot overrides. */
  className?: string;
  /** Optional per-slot overrides. Each is appended after the base slot class. */
  classNames?: { base?: string; icon?: string; spinner?: string };
  children?: React.ReactNode;
}

export function Button({
  variant = "secondary",
  size = "md",
  isLoading,
  isPending,
  disabled,
  isDisabled,
  className,
  classNames,
  type,
  leadingIcon,
  trailingIcon,
  children,
  ...rest
}: ButtonProps) {
  const slots = button({ variant, size });
  const pending = isLoading ?? isPending;
  const disabledResolved = disabled ?? isDisabled;

  return (
    <RACButton
      {...rest}
      type={type ?? "button"}
      isDisabled={disabledResolved}
      isPending={pending}
      data-variant={variant}
      className={composeTwRenderProps(
        classNames?.base,
        slots.base({ className }),
      )}
    >
      {pending ? (
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          className={slots.spinner({ className: classNames?.spinner })}
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
        <span className={slots.icon({ className: classNames?.icon })}>
          {leadingIcon}
        </span>
      ) : null}
      {children}
      {!pending && trailingIcon ? (
        <span className={slots.icon({ className: classNames?.icon })}>
          {trailingIcon}
        </span>
      ) : null}
    </RACButton>
  );
}
