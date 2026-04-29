"use client";

/*
 * Switch — iOS-style on/off toggle backed by Radix Switch.
 */

import * as React from "react";
import { Switch as SwitchPrimitive } from "radix-ui";

import { cn } from "../utils/cn";
import { useResolvedChromeDensity } from "../theme/chrome-style-context";
import {
  switchBaseVariants,
  switchLabelVariants,
  switchThumbVariants,
  switchTrackVariants,
} from "./shadcn";

export interface SwitchProps extends Omit<
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>,
  "className" | "children"
> {
  className?: string;
  classNames?: {
    base?: string;
    track?: string;
    thumb?: string;
    label?: string;
  };
  children?: React.ReactNode;
  /**
   * Visual size. `"sm"` is the Linear-density 26×14 mini-toggle, `"md"`
   * is the 36×20 brand-density iOS-style toggle. Defaults to whichever
   * the surrounding `ChromeStyleProvider` resolves to.
   */
  size?: "sm" | "md";
  /** Explicit density override (alias for choosing between `sm` and `md`). */
  density?: "compact" | "brand";
  isDisabled?: boolean;
  defaultSelected?: boolean;
  isSelected?: boolean;
  ref?: React.Ref<HTMLButtonElement>;
}

export function Switch({
  className,
  classNames,
  children,
  size,
  density: densityProp,
  checked,
  defaultChecked,
  isSelected,
  defaultSelected,
  onCheckedChange,
  disabled,
  isDisabled,
  ref,
  ...rest
}: SwitchProps) {
  const density = useResolvedChromeDensity(densityProp);
  const resolvedSize: "sm" | "md" = size ?? (density === "compact" ? "sm" : "md");
  const resolvedChecked = checked ?? isSelected;
  const resolvedDefaultChecked = defaultChecked ?? defaultSelected;
  const resolvedDisabled = disabled ?? isDisabled;
  const [uncontrolled, setUncontrolled] = React.useState(
    resolvedDefaultChecked ?? false
  );
  const selected = resolvedChecked ?? uncontrolled;

  const handleCheckedChange = React.useCallback(
    (next: boolean) => {
      if (resolvedChecked === undefined) setUncontrolled(next);
      onCheckedChange?.(next);
    },
    [onCheckedChange, resolvedChecked]
  );

  return (
    <SwitchPrimitive.Root
      {...rest}
      ref={ref}
      checked={resolvedChecked}
      defaultChecked={resolvedDefaultChecked}
      onCheckedChange={handleCheckedChange}
      disabled={resolvedDisabled}
      data-density={density}
      data-disabled={resolvedDisabled || undefined}
      className={cn(
        switchBaseVariants({ className: classNames?.base }),
        className,
      )}
    >
      <span
        className={switchTrackVariants({
          size: resolvedSize,
          className: classNames?.track,
        })}
        data-selected={selected || undefined}
      >
        <SwitchPrimitive.Thumb
          className={switchThumbVariants({
            size: resolvedSize,
            className: classNames?.thumb,
          })}
          data-selected={selected || undefined}
        />
      </span>
      {children ? (
        <span
          className={switchLabelVariants({
            size: resolvedSize,
            className: classNames?.label,
          })}
        >
          {children}
        </span>
      ) : null}
    </SwitchPrimitive.Root>
  );
}
