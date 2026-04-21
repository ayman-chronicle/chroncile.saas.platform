"use client";

/*
 * SearchField — a text input with an auto-managed clear button and ESC
 * to clear. RAC wires in the clear button's press handler and the
 * keyboard semantics; we just style it.
 */

import * as React from "react";
import {
  SearchField as RACSearchField,
  Input as RACInput,
  Button as RACButton,
  type SearchFieldProps as RACSearchFieldProps,
} from "react-aria-components";

import { tv } from "../utils/tv";
import { composeTwRenderProps } from "../utils/compose";

const searchFieldStyles = tv({
  slots: {
    root:
      "relative flex w-full items-center rounded-sm border border-hairline-strong " +
      "bg-surface-00 pl-[40px] pr-[8px] " +
      "transition-colors duration-fast ease-out " +
      "data-[focus-within=true]:border-ember " +
      "data-[disabled=true]:opacity-50",
    input:
      "flex-1 bg-transparent py-s-2 font-mono text-mono-lg text-ink " +
      "placeholder:text-ink-faint outline-none " +
      "data-[empty=true]:pr-0",
    icon:
      "pointer-events-none absolute left-s-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim",
    clear:
      "inline-flex h-6 w-6 items-center justify-center rounded-xs text-ink-dim " +
      "data-[empty=true]:hidden " +
      "data-[hovered=true]:text-ink-hi data-[hovered=true]:bg-surface-03 " +
      "data-[focus-visible=true]:outline data-[focus-visible=true]:outline-1 " +
      "data-[focus-visible=true]:outline-ember",
  },
});

export interface SearchFieldProps
  extends Omit<RACSearchFieldProps, "className" | "children"> {
  className?: string;
  placeholder?: string;
}

export function SearchField({
  className,
  placeholder,
  ...rest
}: SearchFieldProps) {
  const slots = searchFieldStyles({});
  return (
    <RACSearchField
      {...rest}
      className={composeTwRenderProps(className, slots.root())}
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className={slots.icon()}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
        />
      </svg>
      <RACInput placeholder={placeholder} className={slots.input()} />
      <RACButton className={slots.clear()} aria-label="Clear">
        <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3">
          <path
            d="M6 18L18 6M6 6l12 12"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        </svg>
      </RACButton>
    </RACSearchField>
  );
}
