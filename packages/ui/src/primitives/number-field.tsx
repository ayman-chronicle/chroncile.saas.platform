"use client";

/*
 * NumberField — numeric input with increment/decrement controls.
 */

import * as React from "react";

import { cn } from "../utils/cn";
import { useResolvedChromeDensity } from "../theme/chrome-style-context";
import {
  numberFieldButtonVariants,
  numberFieldGroupVariants,
  numberFieldInputVariants,
  numberFieldRootVariants,
} from "./shadcn";

export type NumberFieldDensity = "compact" | "brand";

export interface NumberFieldProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "className" | "children" | "value" | "defaultValue" | "onChange" | "type"
> {
  className?: string;
  placeholder?: string;
  density?: NumberFieldDensity;
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  onChange?: (value: number) => void;
  minValue?: number;
  maxValue?: number;
  formatOptions?: Intl.NumberFormatOptions;
}

export function NumberField({
  className,
  placeholder,
  density: densityProp,
  value,
  defaultValue = 0,
  onValueChange,
  onChange,
  min,
  max,
  minValue,
  maxValue,
  formatOptions: _formatOptions,
  step = 1,
  disabled,
  ...rest
}: NumberFieldProps) {
  const density = useResolvedChromeDensity(densityProp);
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const currentValue = value ?? internalValue;
  const numericStep = typeof step === "number" ? step : Number(step) || 1;
  const resolvedMin = minValue ?? (min === undefined ? undefined : Number(min));
  const resolvedMax = maxValue ?? (max === undefined ? undefined : Number(max));

  const setValue = React.useCallback(
    (next: number) => {
      const clamped = Math.min(
        resolvedMax ?? Number.POSITIVE_INFINITY,
        Math.max(resolvedMin ?? Number.NEGATIVE_INFINITY, next)
      );
      if (value === undefined) setInternalValue(clamped);
      onValueChange?.(clamped);
      onChange?.(clamped);
    },
    [onChange, onValueChange, resolvedMax, resolvedMin, value]
  );

  return (
    <div
      data-density={density}
      className={cn(numberFieldRootVariants(), className)}
    >
      <div className={numberFieldGroupVariants({ density })}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setValue(currentValue - numericStep)}
          className={numberFieldButtonVariants({ density })}
          aria-label="Decrement"
        >
          −
        </button>
        <input
          {...rest}
          type="number"
          value={currentValue}
          min={resolvedMin}
          max={resolvedMax}
          step={step}
          disabled={disabled}
          onChange={(event) => setValue(event.currentTarget.valueAsNumber || 0)}
          placeholder={placeholder}
          className={numberFieldInputVariants({ density })}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => setValue(currentValue + numericStep)}
          className={numberFieldButtonVariants({ density })}
          aria-label="Increment"
        >
          +
        </button>
      </div>
    </div>
  );
}
