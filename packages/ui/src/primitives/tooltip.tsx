"use client";

/*
 * Tooltip — hover/focus-triggered flyout with a short description of
 * the element it anchors to. Use exclusively for non-interactive content
 * — anything actionable belongs in a Popover or Menu. RAC wires in the
 * hover + focus delays, dismissal on escape, and `aria-describedby`.
 *
 *   <Tooltip content="Save changes">
 *     <Button isIconOnly>Save</Button>
 *   </Tooltip>
 */

import * as React from "react";
import {
  TooltipTrigger as RACTooltipTrigger,
  Tooltip as RACTooltip,
  OverlayArrow as RACOverlayArrow,
  type TooltipProps as RACTooltipProps,
  type TooltipTriggerComponentProps,
} from "react-aria-components";

import { tv } from "../utils/tv";
import { composeTwRenderProps } from "../utils/compose";

const tooltipStyles = tv({
  slots: {
    tooltip:
      "z-50 rounded-xs border border-hairline-strong bg-surface-02 " +
      "px-s-2 py-s-1 font-mono text-mono-sm text-ink " +
      "shadow-card outline-none " +
      "data-[entering=true]:animate-in data-[entering=true]:fade-in " +
      "data-[exiting=true]:animate-out data-[exiting=true]:fade-out",
    arrow: "fill-surface-02 stroke-hairline-strong",
  },
});

export interface TooltipProps
  extends Omit<TooltipTriggerComponentProps, "children"> {
  children: React.ReactElement;
  content: React.ReactNode;
  placement?: RACTooltipProps["placement"];
  showArrow?: boolean;
  className?: string;
  classNames?: { tooltip?: string; arrow?: string };
  /** Milliseconds before the tooltip appears. Defaults to RAC's 1500ms. */
  delay?: number;
  closeDelay?: number;
}

export function Tooltip({
  children,
  content,
  placement = "top",
  showArrow = false,
  className,
  classNames,
  delay,
  closeDelay,
  ...rest
}: TooltipProps) {
  const slots = tooltipStyles({});
  return (
    <RACTooltipTrigger delay={delay} closeDelay={closeDelay} {...rest}>
      {children}
      <RACTooltip
        placement={placement}
        className={composeTwRenderProps(
          className ?? classNames?.tooltip,
          slots.tooltip(),
        )}
      >
        {showArrow ? (
          <RACOverlayArrow>
            <svg
              viewBox="0 0 8 8"
              className={slots.arrow({ className: classNames?.arrow })}
            >
              <path d="M0 0 L4 4 L8 0" />
            </svg>
          </RACOverlayArrow>
        ) : null}
        {content}
      </RACTooltip>
    </RACTooltipTrigger>
  );
}
