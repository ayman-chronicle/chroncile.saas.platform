"use client";

import * as React from "react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";

import type { VariantProps } from "class-variance-authority";
import { cn } from "../utils/cn";
import { useResolvedChromeDensity } from "../theme/chrome-style-context";
import {
  checkboxBaseVariants,
  checkboxBoxVariants,
  checkboxLabelVariants,
  checkboxMarkVariants,
} from "./shadcn";

type CheckboxVariantProps = VariantProps<typeof checkboxBoxVariants>;

export interface CheckboxProps
  extends
    Omit<
      React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>,
      "className" | "children" | "onChange"
    >,
    CheckboxVariantProps {
  className?: string;
  classNames?: {
    base?: string;
    box?: string;
    mark?: string;
    label?: string;
  };
  /**
   * Visual size. `"sm"` (14 px, Linear-density product chrome) or
   * `"md"` (16 px, brand surface). Defaults to whichever the surrounding
   * `ChromeStyleProvider` resolves to (`compact` → `sm`, `brand` → `md`).
   */
  size?: "sm" | "md";
  /** Explicit density override (alias for choosing between `sm` and `md`). */
  density?: "compact" | "brand";
  /** Native-style selection (alias for `isSelected`). */
  checked?: boolean | "indeterminate";
  defaultChecked?: boolean | "indeterminate";
  isSelected?: boolean;
  defaultSelected?: boolean;
  isDisabled?: boolean;
  onChange?: (checked: boolean) => void;
  ref?: React.Ref<HTMLButtonElement>;
  variant?: "default" | "auth";
  children?: React.ReactNode;
}

export function Checkbox({
  checked,
  defaultChecked,
  isSelected: selectedProp,
  defaultSelected,
  disabled,
  isDisabled,
  onChange,
  onCheckedChange,
  className,
  classNames,
  variant = "default",
  size,
  density: densityProp,
  ref,
  children,
  ...rest
}: CheckboxProps) {
  const density = useResolvedChromeDensity(densityProp);
  const resolvedSize: "sm" | "md" = size ?? (density === "compact" ? "sm" : "md");
  const resolvedChecked = checked ?? selectedProp;
  const resolvedDefaultChecked = defaultChecked ?? defaultSelected;
  const resolvedDisabled = disabled ?? isDisabled;
  const [uncontrolled, setUncontrolled] = React.useState(
    resolvedDefaultChecked ?? false
  );
  const selected = resolvedChecked ?? uncontrolled;
  const isSelected = selected === true || selected === "indeterminate";

  const handleCheckedChange = React.useCallback(
    (next: boolean | "indeterminate") => {
      if (resolvedChecked === undefined) setUncontrolled(next);
      onCheckedChange?.(next);
      onChange?.(next === true);
    },
    [onChange, onCheckedChange, resolvedChecked]
  );

  return (
    <CheckboxPrimitive.Root
      {...rest}
      ref={ref}
      checked={resolvedChecked}
      defaultChecked={resolvedDefaultChecked}
      disabled={resolvedDisabled}
      onCheckedChange={handleCheckedChange}
      data-density={density}
      data-disabled={resolvedDisabled || undefined}
      className={cn(
        checkboxBaseVariants({ className: classNames?.base }),
        className
      )}
    >
      <div
        className={checkboxBoxVariants({
          variant,
          size: resolvedSize,
          className: classNames?.box,
        })}
        data-selected={isSelected || undefined}
        data-indeterminate={selected === "indeterminate" || undefined}
      >
        <CheckboxPrimitive.Indicator forceMount>
          <svg
            aria-hidden
            viewBox="0 0 18 18"
            fill="none"
            className={checkboxMarkVariants({
              size: resolvedSize,
              className: classNames?.mark,
            })}
            data-selected={isSelected || undefined}
            data-indeterminate={selected === "indeterminate" || undefined}
          >
            <polyline points="1 9 7 14 15 4" />
          </svg>
        </CheckboxPrimitive.Indicator>
      </div>
      {children ? (
        <span
          className={checkboxLabelVariants({
            size: resolvedSize,
            className: classNames?.label,
          })}
        >
          {children}
        </span>
      ) : null}
    </CheckboxPrimitive.Root>
  );
}
