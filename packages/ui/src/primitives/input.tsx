"use client";

import * as React from "react";
import {
  Input as RACInput,
  type InputProps as RACInputProps,
} from "react-aria-components/Input";

import { tv, type VariantProps } from "../utils/tv";
import { composeTwRenderProps } from "../utils/compose";

/**
 * Input is a direct swap for `<input>` — RAC's `<Input>` subcomponent
 * accepts every native input attribute and additionally emits
 * `data-hovered`, `data-focused`, `data-focus-visible`, `data-invalid`,
 * `data-disabled` so we target all states from CSS without consumer churn.
 *
 * When this is the child of a RAC `<TextField>`, RAC auto-wires
 * `aria-describedby` to the sibling `<Text slot="description">` and
 * `aria-errormessage` to `<FieldError>`. Outside a TextField it behaves as
 * a plain input.
 */

const input = tv({
  base:
    "w-full rounded-sm border bg-surface-00 px-s-3 py-s-2 font-mono " +
    "text-mono-lg text-ink placeholder:text-ink-faint " +
    "transition-colors duration-fast ease-out outline-none " +
    "data-[hovered=true]:border-ink-dim " +
    "data-[focused=true]:border-ember " +
    "data-[invalid=true]:border-event-red " +
    "data-[focused=true]:data-[invalid=true]:border-event-red " +
    "data-[disabled=true]:opacity-50 data-[disabled=true]:cursor-not-allowed",
  variants: {
    variant: {
      default: "border-hairline-strong",
      auth:
        "bg-transparent border-hairline-strong text-ink-hi " +
        "data-[focused=true]:border-ink-hi",
    },
    search: { true: "pl-[40px]" },
    invalid: { true: "border-event-red data-[focused=true]:border-event-red" },
  },
  defaultVariants: { variant: "default" },
});

type InputVariantProps = VariantProps<typeof input>;

export interface InputProps
  extends Omit<RACInputProps, "className">,
    InputVariantProps {
  className?: string;
  /** Render a leading search glyph and adjust padding. */
  search?: boolean;
  invalid?: boolean;
  variant?: "default" | "auth";
  /** Wrapper className when `search` is true. */
  wrapperClassName?: string;
}

export function Input({
  search = false,
  invalid = false,
  variant = "default",
  className,
  wrapperClassName,
  ref,
  ...props
}: InputProps & { ref?: React.Ref<HTMLInputElement> }) {
  const field = (
    <RACInput
      {...props}
      ref={ref}
      className={composeTwRenderProps(
        undefined,
        input({ variant, search, invalid, className }),
      )}
    />
  );

  if (!search) return field;

  return (
    <div className={`relative ${wrapperClassName ?? ""}`}>
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="pointer-events-none absolute left-s-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
        />
      </svg>
      {field}
    </div>
  );
}
