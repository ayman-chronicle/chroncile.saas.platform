"use client";

import * as React from "react";
import {
  TextArea as RACTextArea,
  type TextAreaProps as RACTextAreaProps,
} from "react-aria-components/TextArea";

import { tv, type VariantProps } from "../utils/tv";
import { composeTwRenderProps } from "../utils/compose";

const textarea = tv({
  base:
    "min-h-[120px] w-full resize-y rounded-sm border bg-surface-00 " +
    "px-s-3 py-s-2 font-mono text-mono-lg text-ink placeholder:text-ink-faint " +
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
    invalid: { true: "border-event-red data-[focused=true]:border-event-red" },
  },
  defaultVariants: { variant: "default" },
});

type TextareaVariantProps = VariantProps<typeof textarea>;

export interface TextareaProps
  extends Omit<RACTextAreaProps, "className">,
    TextareaVariantProps {
  className?: string;
  invalid?: boolean;
  variant?: "default" | "auth";
}

export function Textarea({
  invalid = false,
  variant = "default",
  className,
  ref,
  ...props
}: TextareaProps & { ref?: React.Ref<HTMLTextAreaElement> }) {
  return (
    <RACTextArea
      {...props}
      ref={ref}
      className={composeTwRenderProps(
        undefined,
        textarea({ variant, invalid, className }),
      )}
    />
  );
}
