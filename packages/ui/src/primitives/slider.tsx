"use client";

/*
 * Slider — Radix-backed single or range value within a min/max.
 *
 *   <Slider defaultValue={50} minValue={0} maxValue={100}>
 *     <SliderOutput />
 *   </Slider>
 *
 *   <Slider defaultValue={[10, 90]} minValue={0} maxValue={100}>
 *     <SliderOutput />
 *   </Slider>
 */

import * as React from "react";
import { Slider as SliderPrimitive } from "radix-ui";

import { cn } from "../utils/cn";
import { useResolvedChromeDensity } from "../theme/chrome-style-context";
import {
  sliderFillVariants,
  sliderOutputVariants,
  sliderRootVariants,
  sliderThumbVariants,
  sliderTrackVariants,
} from "./shadcn";

export interface SliderProps extends Omit<
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>,
  "className" | "children" | "value" | "defaultValue" | "onValueChange"
> {
  className?: string;
  density?: "compact" | "brand";
  value?: number | number[];
  defaultValue?: number | number[];
  onValueChange?: (value: number[]) => void;
  minValue?: number;
  maxValue?: number;
  /** Show the numeric value(s) above the track. */
  showOutput?: boolean;
  /** Show a filled track between min and the current value / between thumbs. */
  showFill?: boolean;
  ref?: React.Ref<HTMLSpanElement>;
}

function toArray(value: number | number[] | undefined) {
  return Array.isArray(value) ? value : [value ?? 0];
}

function formatOutput(value: number[]) {
  return value.length > 1 ? value.join(" – ") : (value[0] ?? 0).toString();
}

export function Slider<T extends number | number[] = number[]>({
  className,
  density: densityProp,
  value,
  defaultValue = [0],
  onValueChange,
  minValue,
  maxValue,
  showOutput = true,
  showFill = true,
  ref,
  ...rest
}: SliderProps) {
  const density = useResolvedChromeDensity(densityProp);
  const defaultArray = React.useMemo(() => toArray(defaultValue), [defaultValue]);
  const [uncontrolled, setUncontrolled] = React.useState(defaultArray);
  const values = value === undefined ? uncontrolled : toArray(value);

  const handleValueChange = React.useCallback(
    (next: number[]) => {
      if (value === undefined) setUncontrolled(next);
      onValueChange?.(next);
    },
    [onValueChange, value]
  );

  return (
    <SliderPrimitive.Root
      {...rest}
      ref={ref}
      min={minValue ?? rest.min}
      max={maxValue ?? rest.max}
      value={value === undefined ? undefined : toArray(value)}
      defaultValue={defaultArray}
      onValueChange={handleValueChange}
      data-density={density}
      className={cn(sliderRootVariants(), className)}
    >
      {showOutput ? (
        <output className={sliderOutputVariants({ density })}>
          {formatOutput(values)}
        </output>
      ) : null}
      <SliderPrimitive.Track className={sliderTrackVariants({ density })}>
        {showFill ? (
          <SliderPrimitive.Range className={sliderFillVariants()} />
        ) : null}
      </SliderPrimitive.Track>
      {values.map((_, index) => (
        <SliderPrimitive.Thumb
          key={index}
          className={sliderThumbVariants({ density })}
        />
      ))}
    </SliderPrimitive.Root>
  );
}
