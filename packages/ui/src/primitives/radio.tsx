"use client";

/*
 * RadioGroup + Radio — single-select exclusive choice. Keyboard nav
 * (arrows), focus rings, required/invalid ARIA all come from RAC.
 *
 *   <RadioGroup value={v} onChange={setV}>
 *     <Radio value="stg">Staging</Radio>
 *     <Radio value="prod">Production</Radio>
 *   </RadioGroup>
 */

import * as React from "react";
import {
  RadioGroup as RACRadioGroup,
  Radio as RACRadio,
  type RadioGroupProps as RACRadioGroupProps,
  type RadioProps as RACRadioProps,
} from "react-aria-components";

import { tv } from "../utils/tv";
import { composeTwRenderProps } from "../utils/compose";

const radioStyles = tv({
  slots: {
    group: "flex flex-col gap-s-2 data-[orientation=horizontal]:flex-row",
    radio:
      "inline-flex items-center gap-s-2 cursor-pointer " +
      "data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-50",
    indicator:
      "relative flex h-[16px] w-[16px] shrink-0 items-center justify-center " +
      "rounded-full border border-hairline-strong bg-surface-00 " +
      "transition-colors duration-fast ease-out " +
      "data-[hovered=true]:border-ink-dim " +
      "data-[focus-visible=true]:outline data-[focus-visible=true]:outline-1 " +
      "data-[focus-visible=true]:outline-ember " +
      "data-[selected=true]:border-ember " +
      "data-[invalid=true]:border-event-red",
    dot:
      "h-[6px] w-[6px] rounded-full bg-ember opacity-0 " +
      "data-[selected=true]:opacity-100",
    label: "font-sans text-sm text-ink",
  },
});

export interface RadioGroupProps
  extends Omit<RACRadioGroupProps, "className" | "children"> {
  className?: string;
  children: React.ReactNode;
}

export function RadioGroup({ className, children, ...rest }: RadioGroupProps) {
  const slots = radioStyles({});
  return (
    <RACRadioGroup
      {...rest}
      className={composeTwRenderProps(className, slots.group())}
    >
      {children as React.ReactNode}
    </RACRadioGroup>
  );
}

export interface RadioProps
  extends Omit<RACRadioProps, "className" | "children"> {
  className?: string;
  classNames?: { base?: string; indicator?: string; dot?: string; label?: string };
  children?: React.ReactNode;
}

export function Radio({ className, classNames, children, ...rest }: RadioProps) {
  const slots = radioStyles({});
  return (
    <RACRadio
      {...rest}
      className={composeTwRenderProps(
        className,
        slots.radio({ className: classNames?.base }),
      )}
    >
      <span className={slots.indicator({ className: classNames?.indicator })}>
        <span className={slots.dot({ className: classNames?.dot })} />
      </span>
      {children ? (
        <span className={slots.label({ className: classNames?.label })}>
          {children}
        </span>
      ) : null}
    </RACRadio>
  );
}
