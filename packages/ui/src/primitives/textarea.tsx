"use client";

import * as React from "react";
import type { VariantProps } from "class-variance-authority";

import { useResolvedChromeDensity } from "../theme/chrome-style-context";
import { textareaVariants } from "./shadcn";

export type TextareaDensity = "compact" | "brand";

type TextareaVariantProps = VariantProps<typeof textareaVariants>;

export interface TextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "className">,
    TextareaVariantProps {
  className?: string;
  density?: TextareaDensity;
  invalid?: boolean;
  variant?: "default" | "auth";
  ref?: React.Ref<HTMLTextAreaElement>;
}

export function Textarea({
  invalid = false,
  variant = "default",
  density: densityProp,
  className,
  ref,
  ...props
}: TextareaProps & { ref?: React.Ref<HTMLTextAreaElement> }) {
  const density = useResolvedChromeDensity(densityProp);
  return (
    <textarea
      {...props}
      ref={ref}
      data-density={density}
      data-invalid={invalid || undefined}
      className={textareaVariants({ density, variant, invalid, className })}
    />
  );
}
