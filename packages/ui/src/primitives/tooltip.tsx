"use client";

/*
 * Tooltip — hover/focus-triggered flyout with a short description of
 * the element it anchors to. Use exclusively for non-interactive content
 * — anything actionable belongs in a Popover or Menu.
 *
 *   <Tooltip content="Save changes">
 *     <Button isIconOnly>Save</Button>
 *   </Tooltip>
 */

import * as React from "react";
import { Tooltip as TooltipPrimitive } from "radix-ui";

import { cn } from "../utils/cn";
import { useResolvedChromeDensity } from "../theme/chrome-style-context";
import { tooltipArrowVariants, tooltipVariants } from "./shadcn";

export interface TooltipProps
  extends Omit<React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Root>, "children"> {
  children: React.ReactElement;
  content: React.ReactNode;
  placement?: React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>["side"];
  side?: React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>["side"];
  align?: React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>["align"];
  showArrow?: boolean;
  className?: string;
  classNames?: { tooltip?: string; arrow?: string };
  /** Milliseconds before the tooltip appears. */
  delay?: number;
  closeDelay?: number;
  density?: "compact" | "brand";
}

export function Tooltip({
  children,
  content,
  placement,
  side = "top",
  align = "center",
  showArrow = false,
  className,
  classNames,
  delay,
  density: densityProp,
  ...rest
}: TooltipProps) {
  const density = useResolvedChromeDensity(densityProp);
  const resolvedSide = placement ?? side;
  return (
    <TooltipPrimitive.Provider delayDuration={delay}>
      <TooltipPrimitive.Root {...rest}>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={resolvedSide}
            align={align}
            className={cn(tooltipVariants({ density }), classNames?.tooltip, className)}
          >
            {showArrow ? (
              <TooltipPrimitive.Arrow asChild>
                <svg
                  viewBox="0 0 8 8"
                  className={tooltipArrowVariants({ className: classNames?.arrow })}
                >
                  <path d="M0 0 L4 4 L8 0" />
                </svg>
              </TooltipPrimitive.Arrow>
            ) : null}
            {content}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
