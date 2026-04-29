"use client";

/*
 * Popover — positioned overlay anchored to a trigger.
 *
 * Use for action confirmations, settings flyouts, pickers, and any
 * floating surface where the trigger itself is interactive. For modal
 * dialogs (backdrop + focus trap over full viewport) use `Modal`. For
 * tooltips (hover-only, no trigger semantics beyond hover/focus) use
 * `Tooltip`.
 *
 * Compound API:
 *
 *   <Popover>
 *     <PopoverTrigger>
 *       <Button>Open</Button>
 *     </PopoverTrigger>
 *     <PopoverContent placement="bottom">...</PopoverContent>
 *   </Popover>
 */

import * as React from "react";
import { Popover as PopoverPrimitive } from "radix-ui";

import { cn } from "../utils/cn";
import { useResolvedChromeDensity } from "../theme/chrome-style-context";
import {
  popoverArrowVariants,
  popoverDialogVariants,
  popoverVariants,
} from "./shadcn";

type PopoverSide = React.ComponentPropsWithoutRef<
  typeof PopoverPrimitive.Content
>["side"];
type PopoverAlign = React.ComponentPropsWithoutRef<
  typeof PopoverPrimitive.Content
>["align"];

export interface PopoverProps
  extends React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Root> {}

export function Popover(props: PopoverProps) {
  return <PopoverPrimitive.Root {...props} />;
}

export function PopoverTrigger({ children }: { children: React.ReactNode }) {
  return <PopoverPrimitive.Trigger asChild>{children}</PopoverPrimitive.Trigger>;
}

export interface PopoverContentProps extends Omit<
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>,
  "className"
> {
  className?: string;
  classNames?: { popover?: string; dialog?: string; arrow?: string };
  /** Render a directional arrow pointing at the trigger. Off by default. */
  showArrow?: boolean;
  density?: "compact" | "brand";
  placement?: "top" | "bottom" | "left" | "right" | string;
  children: React.ReactNode;
}

export function PopoverContent({
  className,
  classNames,
  showArrow = false,
  density: densityProp,
  placement,
  side,
  align,
  children,
  ...rest
}: PopoverContentProps) {
  const density = useResolvedChromeDensity(densityProp);
  const [placementSide, placementAlign] = String(placement ?? "").split(" ");
  const resolvedSide = side ?? (placementSide ? (placementSide as PopoverSide) : undefined);
  const resolvedAlign =
    align ?? (placementAlign ? (placementAlign as PopoverAlign) : undefined);
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        {...rest}
        side={resolvedSide}
        align={resolvedAlign}
        className={cn(popoverVariants({ density }), classNames?.popover, className)}
      >
        {showArrow ? (
          <PopoverPrimitive.Arrow asChild>
          <svg
            viewBox="0 0 12 12"
            className={popoverArrowVariants({ className: classNames?.arrow })}
          >
            <path d="M0 0 L6 6 L12 0" />
          </svg>
          </PopoverPrimitive.Arrow>
        ) : null}
        <div
          role="dialog"
          className={popoverDialogVariants({ className: classNames?.dialog })}
        >
          {children}
        </div>
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  );
}
