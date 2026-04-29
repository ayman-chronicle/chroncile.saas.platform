"use client";

/*
 * ProgressBar — determinate or indeterminate.
 */

import * as React from "react";

import { cn } from "../utils/cn";
import { useResolvedChromeDensity } from "../theme/chrome-style-context";
import {
  progressFillVariants,
  progressIndeterminateVariants,
  progressLabelVariants,
  progressRootVariants,
  progressTrackVariants,
} from "./shadcn";

export type ProgressBarDensity = "compact" | "brand";

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  label?: React.ReactNode;
  density?: ProgressBarDensity;
  value?: number;
  min?: number;
  max?: number;
  valueText?: string;
  isIndeterminate?: boolean;
}

export function ProgressBar({
  className,
  label,
  density: densityProp,
  value,
  min = 0,
  max = 100,
  valueText,
  isIndeterminate = value === undefined,
  ...rest
}: ProgressBarProps) {
  const density = useResolvedChromeDensity(densityProp);
  const percentage =
    isIndeterminate || value === undefined
      ? 0
      : ((value - min) / Math.max(1, max - min)) * 100;
  const displayValueText =
    valueText ?? (!isIndeterminate && value !== undefined ? `${Math.round(percentage)}%` : undefined);

  return (
    <div
      {...rest}
      role="progressbar"
      aria-valuemin={isIndeterminate ? undefined : min}
      aria-valuemax={isIndeterminate ? undefined : max}
      aria-valuenow={isIndeterminate ? undefined : value}
      aria-valuetext={displayValueText}
      className={cn(progressRootVariants({ density }), className)}
    >
      {label || displayValueText ? (
        <div className={progressLabelVariants({ density })}>
          {label ? <span>{label}</span> : <span />}
          {displayValueText ? <span>{displayValueText}</span> : null}
        </div>
      ) : null}
      <div className={progressTrackVariants({ density })}>
        {isIndeterminate ? (
          <div className={progressIndeterminateVariants()} />
        ) : (
          <div
            className={progressFillVariants()}
            style={{ width: `${percentage}%` }}
          />
        )}
      </div>
    </div>
  );
}
