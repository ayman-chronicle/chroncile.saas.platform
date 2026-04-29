"use client";

/*
 * RadioGroup + Radio — single-select exclusive choice. Keyboard nav
 * and ARIA state are provided by Radix RadioGroup.
 *
 *   <RadioGroup value={v} onChange={setV}>
 *     <Radio value="stg">Staging</Radio>
 *     <Radio value="prod">Production</Radio>
 *   </RadioGroup>
 */

import * as React from "react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";

import { cn } from "../utils/cn";
import { useResolvedChromeDensity } from "../theme/chrome-style-context";
import {
  radioBaseVariants,
  radioDotVariants,
  radioGroupVariants,
  radioIndicatorVariants,
  radioLabelVariants,
} from "./shadcn";

export type RadioSize = "sm" | "md";

export interface RadioGroupProps extends Omit<
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>,
  "className" | "children"
> {
  className?: string;
  children: React.ReactNode;
  /**
   * Default size for Radios inside this group. Individual `<Radio size>`
   * still wins. Reach for `"sm"` on Linear-density product surfaces.
   * When omitted, the surrounding `ChromeStyleProvider` decides
   * (`compact` → `sm`, `brand` → `md`).
   */
  size?: RadioSize;
  /** Explicit density override (alias for choosing between `sm` and `md`). */
  density?: "compact" | "brand";
  ref?: React.Ref<HTMLDivElement>;
}

const RadioSizeContext = React.createContext<RadioSize>("md");
const RadioValueContext = React.createContext<string | undefined>(undefined);

export function RadioGroup({
  className,
  children,
  size,
  density: densityProp,
  value,
  defaultValue,
  onValueChange,
  ref,
  ...rest
}: RadioGroupProps) {
  const density = useResolvedChromeDensity(densityProp);
  const resolvedSize: RadioSize = size ?? (density === "compact" ? "sm" : "md");
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue);
  const selectedValue = value ?? uncontrolled;

  const handleValueChange = React.useCallback(
    (next: string) => {
      if (value === undefined) setUncontrolled(next);
      onValueChange?.(next);
    },
    [onValueChange, value]
  );

  return (
    <RadioGroupPrimitive.Root
      {...rest}
      ref={ref}
      value={value}
      defaultValue={defaultValue}
      onValueChange={handleValueChange}
      data-density={density}
      className={cn(radioGroupVariants(), className)}
    >
      <RadioSizeContext.Provider value={resolvedSize}>
        <RadioValueContext.Provider value={selectedValue}>
          {children as React.ReactNode}
        </RadioValueContext.Provider>
      </RadioSizeContext.Provider>
    </RadioGroupPrimitive.Root>
  );
}

export interface RadioProps extends Omit<
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>,
  "className" | "children"
> {
  className?: string;
  classNames?: {
    base?: string;
    indicator?: string;
    dot?: string;
    label?: string;
  };
  children?: React.ReactNode;
  size?: RadioSize;
  ref?: React.Ref<HTMLButtonElement>;
}

export function Radio({
  className,
  classNames,
  children,
  size,
  ref,
  value,
  disabled,
  ...rest
}: RadioProps) {
  const ctxSize = React.useContext(RadioSizeContext);
  const selectedValue = React.useContext(RadioValueContext);
  const resolved: RadioSize = size ?? ctxSize;
  const selected = selectedValue === value;

  return (
    <RadioGroupPrimitive.Item
      {...rest}
      ref={ref}
      value={value}
      disabled={disabled}
      data-disabled={disabled || undefined}
      className={cn(
        radioBaseVariants({ className: classNames?.base }),
        className
      )}
    >
      <span
        className={radioIndicatorVariants({
          size: resolved,
          className: classNames?.indicator,
        })}
        data-selected={selected || undefined}
      >
        <RadioGroupPrimitive.Indicator forceMount>
          <span
            className={radioDotVariants({
              size: resolved,
              className: classNames?.dot,
            })}
            data-selected={selected || undefined}
          />
        </RadioGroupPrimitive.Indicator>
      </span>
      {children ? (
        <span
          className={radioLabelVariants({
            size: resolved,
            className: classNames?.label,
          })}
        >
          {children}
        </span>
      ) : null}
    </RadioGroupPrimitive.Item>
  );
}
