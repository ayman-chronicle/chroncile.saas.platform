"use client";

import * as React from "react";

import { useResolvedChromeDensity } from "../theme/chrome-style-context";
import {
  formFieldDescriptionVariants,
  formFieldErrorVariants,
  formFieldLabelVariants,
  formFieldRootVariants,
} from "./shadcn";

/*
 * FormField is a layout shell that pairs a label, description, and error
 * slot with a single field child. Consumers pass `htmlFor` / ARIA wiring
 * explicitly when the child needs programmatic association.
 */

export interface FormFieldProps {
  children: React.ReactNode;
  label?: React.ReactNode;
  htmlFor?: string;
  description?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  tone?: "default" | "auth";
  /** Force a density flavor. Defaults to whichever the surrounding
   * `ChromeStyleProvider` resolves to. */
  density?: "compact" | "brand";
  className?: string;
  labelClassName?: string;
  descriptionClassName?: string;
  errorClassName?: string;
}

export function FormField({
  children,
  label,
  htmlFor,
  description,
  error,
  required = false,
  tone = "default",
  density: densityProp,
  className,
  labelClassName,
  descriptionClassName,
  errorClassName,
}: FormFieldProps) {
  const density = useResolvedChromeDensity(densityProp);

  return (
    <div
      className={formFieldRootVariants({ density, className })}
      data-density={density}
    >
      {label ? (
        <label
          htmlFor={htmlFor}
          className={formFieldLabelVariants({
            density,
            tone,
            className: labelClassName,
          })}
        >
          {label}
          {required ? (
            <span className="ml-[4px] text-event-red">*</span>
          ) : null}
        </label>
      ) : null}

      {children}

      {description ? (
        <p
          className={formFieldDescriptionVariants({
            density,
            className: descriptionClassName,
          })}
        >
          {description}
        </p>
      ) : null}

      {error ? (
        <p
          className={formFieldErrorVariants({
            density,
            className: errorClassName,
          })}
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
