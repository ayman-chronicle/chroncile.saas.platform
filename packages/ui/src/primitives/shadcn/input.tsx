"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../utils/cn";

export const inputVariants = cva(
  "w-full border outline-none transition-[border-color,box-shadow,background-color] duration-fast ease-out disabled:cursor-not-allowed disabled:opacity-50 data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-50",
  {
    variants: {
      density: {
        compact:
          "h-[28px] rounded-l border-l-border bg-l-surface-input px-[10px] font-sans text-[13px] text-l-ink placeholder:text-l-ink-dim hover:border-l-border-strong focus:border-[rgba(216,67,10,0.5)] focus:shadow-[0_0_0_3px_rgba(216,67,10,0.12)] data-[hovered=true]:border-l-border-strong data-[focused=true]:border-[rgba(216,67,10,0.5)] data-[focused=true]:shadow-[0_0_0_3px_rgba(216,67,10,0.12)] data-[invalid=true]:border-event-red data-[focused=true]:data-[invalid=true]:border-event-red",
        brand:
          "rounded-sm border-hairline-strong bg-surface-00 px-s-3 py-s-2 font-mono text-mono-lg text-ink placeholder:text-ink-faint hover:border-ink-dim focus:border-ember data-[hovered=true]:border-ink-dim data-[focused=true]:border-ember data-[invalid=true]:border-event-red data-[focused=true]:data-[invalid=true]:border-event-red",
      },
      variant: {
        default: "",
        auth: "border-hairline-strong bg-transparent text-ink-hi focus:border-ink-hi data-[focused=true]:border-ink-hi",
      },
      search: {
        true: "pl-[36px]",
      },
      invalid: {
        true: "border-event-red focus:border-event-red data-[focused=true]:border-event-red",
      },
    },
    defaultVariants: {
      density: "compact",
      variant: "default",
    },
  }
);

export interface ShadcnInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "color">,
    VariantProps<typeof inputVariants> {}

export const ShadcnInput = React.forwardRef<HTMLInputElement, ShadcnInputProps>(
  ({ className, density, invalid, search, variant, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(inputVariants({ density, invalid, search, variant }), className)}
      data-density={density}
      data-invalid={invalid || undefined}
      {...props}
    />
  )
);

ShadcnInput.displayName = "ShadcnInput";
