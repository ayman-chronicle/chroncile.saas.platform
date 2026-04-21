"use client";

/*
 * ProgressBar — determinate or indeterminate. RAC handles `aria-valuenow`
 * / `aria-valuetext` + the indeterminate signal (pass no `value`).
 */

import * as React from "react";
import {
  ProgressBar as RACProgressBar,
  Label as RACLabel,
  type ProgressBarProps as RACProgressBarProps,
} from "react-aria-components";

import { tv } from "../utils/tv";
import { composeTwRenderProps } from "../utils/compose";

const progressStyles = tv({
  slots: {
    root: "flex flex-col gap-s-2 w-full",
    label:
      "flex items-center justify-between font-mono text-mono-sm uppercase tracking-tactical text-ink-dim",
    track: "relative h-[4px] w-full rounded-pill bg-surface-03 overflow-hidden",
    fill:
      "absolute inset-y-0 left-0 bg-ember transition-[width] duration-fast ease-out",
    indeterminate:
      "absolute inset-y-0 w-1/3 bg-ember animate-chron-indeterminate",
  },
});

export interface ProgressBarProps
  extends Omit<RACProgressBarProps, "className" | "children"> {
  className?: string;
  label?: React.ReactNode;
}

export function ProgressBar({
  className,
  label,
  ...rest
}: ProgressBarProps) {
  const slots = progressStyles({});
  return (
    <RACProgressBar
      {...rest}
      className={composeTwRenderProps(className, slots.root())}
    >
      {({ percentage, valueText, isIndeterminate }) => (
        <>
          {label || valueText ? (
            <div className={slots.label()}>
              {label ? <RACLabel>{label}</RACLabel> : <span />}
              {valueText ? <span>{valueText}</span> : null}
            </div>
          ) : null}
          <div className={slots.track()}>
            {isIndeterminate ? (
              <div className={slots.indeterminate()} />
            ) : (
              <div
                className={slots.fill()}
                style={{ width: `${percentage ?? 0}%` }}
              />
            )}
          </div>
        </>
      )}
    </RACProgressBar>
  );
}
