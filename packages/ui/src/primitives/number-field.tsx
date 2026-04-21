"use client";

/*
 * NumberField — locale-aware numeric input with increment/decrement
 * buttons. RAC owns the parsing, clamping, keyboard +/-/arrow semantics,
 * and localized formatting via the `I18nProvider` at the app root.
 */

import * as React from "react";
import {
  NumberField as RACNumberField,
  Input as RACInput,
  Group as RACGroup,
  Button as RACButton,
  type NumberFieldProps as RACNumberFieldProps,
} from "react-aria-components";

import { tv } from "../utils/tv";
import { composeTwRenderProps } from "../utils/compose";

const numberFieldStyles = tv({
  slots: {
    root: "flex flex-col gap-s-1",
    group:
      "flex items-stretch rounded-sm border border-hairline-strong bg-surface-00 " +
      "transition-colors duration-fast ease-out " +
      "data-[focus-within=true]:border-ember " +
      "data-[invalid=true]:border-event-red " +
      "data-[disabled=true]:opacity-50 data-[disabled=true]:cursor-not-allowed",
    input:
      "flex-1 bg-transparent px-s-3 py-s-2 font-mono text-mono-lg text-ink " +
      "placeholder:text-ink-faint outline-none",
    button:
      "inline-flex h-full w-[28px] items-center justify-center text-ink-dim " +
      "transition-colors duration-fast ease-out " +
      "data-[hovered=true]:bg-surface-03 data-[hovered=true]:text-ink-hi " +
      "data-[focus-visible=true]:outline data-[focus-visible=true]:outline-1 " +
      "data-[focus-visible=true]:outline-ember " +
      "data-[disabled=true]:opacity-50 data-[disabled=true]:cursor-not-allowed",
  },
});

export interface NumberFieldProps
  extends Omit<RACNumberFieldProps, "className" | "children"> {
  className?: string;
  placeholder?: string;
}

export function NumberField({
  className,
  placeholder,
  ...rest
}: NumberFieldProps) {
  const slots = numberFieldStyles({});
  return (
    <RACNumberField
      {...rest}
      className={composeTwRenderProps(className, slots.root())}
    >
      <RACGroup className={slots.group()}>
        <RACButton slot="decrement" className={slots.button()} aria-label="Decrement">
          −
        </RACButton>
        <RACInput placeholder={placeholder} className={slots.input()} />
        <RACButton slot="increment" className={slots.button()} aria-label="Increment">
          +
        </RACButton>
      </RACGroup>
    </RACNumberField>
  );
}
