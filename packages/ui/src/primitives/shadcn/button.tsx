"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../utils/cn";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-[6px] border transition-[background-color,color,border-color,transform] duration-fast ease-out outline-none whitespace-nowrap select-none disabled:cursor-not-allowed disabled:opacity-40 data-[focus-visible=true]:ring-1 data-[focus-visible=true]:ring-ember data-[focus-visible=true]:ring-offset-1 data-[focus-visible=true]:ring-offset-page data-[pressed=true]:translate-y-[1px] data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-40 data-[pending=true]:cursor-wait",
  {
    variants: {
      density: {
        compact: "rounded-md font-sans font-medium tracking-normal leading-none",
        brand: "rounded-xs font-mono uppercase tracking-tactical",
      },
      variant: {
        primary: "border-transparent",
        secondary: "",
        ember: "border-transparent",
        ghost: "border-transparent bg-transparent",
        icon: "border-transparent",
        critical: "border-transparent",
        data: "border-transparent",
        nominal: "border-transparent",
      },
      size: {
        sm: "",
        md: "",
        lg: "",
      },
    },
    compoundVariants: [
      { density: "compact", size: "sm", class: "h-[28px] px-[10px] text-[12.5px]" },
      { density: "compact", size: "md", class: "h-[32px] px-[12px] text-[13px]" },
      { density: "compact", size: "lg", class: "h-[36px] px-[14px] text-[13px]" },
      {
        density: "compact",
        variant: "primary",
        class:
          "bg-ember text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_1px_1px_rgba(0,0,0,0.35)] data-[hovered=true]:bg-[#e85520] data-[pressed=true]:bg-ember-deep hover:bg-[#e85520]",
      },
      {
        density: "compact",
        variant: "secondary",
        class:
          "bg-l-wash-3 border-l-border text-l-ink data-[hovered=true]:bg-l-wash-5 data-[hovered=true]:border-l-border-strong hover:bg-l-wash-5 hover:border-l-border-strong",
      },
      {
        density: "compact",
        variant: "ghost",
        class:
          "text-l-ink-lo data-[hovered=true]:bg-l-wash-3 data-[hovered=true]:text-l-ink hover:bg-l-wash-3 hover:text-l-ink",
      },
      {
        density: "compact",
        variant: "icon",
        class:
          "text-l-ink-lo data-[hovered=true]:bg-l-wash-3 data-[hovered=true]:text-l-ink hover:bg-l-wash-3 hover:text-l-ink p-0",
      },
      {
        density: "compact",
        variant: "critical",
        class: "bg-event-red text-white data-[hovered=true]:brightness-110 hover:brightness-110",
      },
      {
        density: "compact",
        variant: "ember",
        class:
          "bg-ember text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_1px_1px_rgba(0,0,0,0.35)] data-[hovered=true]:bg-[#e85520] data-[pressed=true]:bg-ember-deep hover:bg-[#e85520]",
      },
      {
        density: "compact",
        variant: "data",
        class: "bg-event-teal text-black data-[hovered=true]:brightness-110 hover:brightness-110",
      },
      {
        density: "compact",
        variant: "nominal",
        class: "bg-event-green text-black data-[hovered=true]:brightness-110 hover:brightness-110",
      },
      { density: "compact", variant: "icon", size: "sm", class: "w-[28px] px-0" },
      { density: "compact", variant: "icon", size: "md", class: "w-[32px] px-0" },
      { density: "compact", variant: "icon", size: "lg", class: "w-[36px] px-0" },
      { density: "brand", size: "sm", class: "h-[28px] px-s-3 text-mono-sm" },
      { density: "brand", size: "md", class: "h-[36px] px-s-4 text-mono" },
      { density: "brand", size: "lg", class: "h-[44px] px-s-5 text-mono-lg" },
      {
        density: "brand",
        variant: "primary",
        class:
          "border-transparent text-[color:var(--c-btn-invert-fg)] [background:var(--c-btn-invert-bg)] data-[hovered=true]:[background:var(--c-ink-hi)] hover:[background:var(--c-ink-hi)]",
      },
      {
        density: "brand",
        variant: "secondary",
        class:
          "border-hairline-strong bg-transparent text-ink-lo data-[hovered=true]:text-ink-hi data-[hovered=true]:border-ink-dim hover:text-ink-hi hover:border-ink-dim",
      },
      {
        density: "brand",
        variant: "ember",
        class: "border-transparent bg-ember text-white data-[hovered=true]:bg-ember-deep hover:bg-ember-deep",
      },
      {
        density: "brand",
        variant: "ghost",
        class:
          "border-transparent bg-transparent text-ink-lo data-[hovered=true]:bg-surface-03 data-[hovered=true]:text-ink-hi hover:bg-surface-03 hover:text-ink-hi",
      },
      {
        density: "brand",
        variant: "icon",
        class:
          "border-transparent bg-transparent text-ink-lo data-[hovered=true]:bg-surface-03 data-[hovered=true]:text-ink-hi hover:bg-surface-03 hover:text-ink-hi p-0",
      },
      {
        density: "brand",
        variant: "critical",
        class: "border-transparent bg-event-red text-white data-[hovered=true]:brightness-110 hover:brightness-110",
      },
      {
        density: "brand",
        variant: "data",
        class: "border-transparent bg-event-teal text-black data-[hovered=true]:brightness-110 hover:brightness-110",
      },
      {
        density: "brand",
        variant: "nominal",
        class: "border-transparent bg-event-green text-black data-[hovered=true]:brightness-110 hover:brightness-110",
      },
      { density: "brand", variant: "icon", size: "sm", class: "w-[28px] px-0" },
      { density: "brand", variant: "icon", size: "md", class: "w-[36px] px-0" },
      { density: "brand", variant: "icon", size: "lg", class: "w-[44px] px-0" },
    ],
    defaultVariants: {
      density: "compact",
      variant: "secondary",
      size: "md",
    },
  }
);

export const buttonIconVariants = cva("shrink-0");
export const buttonSpinnerVariants = cva("h-4 w-4 shrink-0 animate-spin");

export interface ShadcnButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const ShadcnButton = React.forwardRef<HTMLButtonElement, ShadcnButtonProps>(
  ({ className, density, size, variant, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ density, size, variant }), className)}
      data-density={density}
      data-variant={variant}
      {...props}
    />
  )
);

ShadcnButton.displayName = "ShadcnButton";
