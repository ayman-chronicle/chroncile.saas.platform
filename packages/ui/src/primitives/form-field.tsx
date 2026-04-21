"use client";

import * as React from "react";
import {
  Label as RACLabel,
  Text as RACText,
  FieldError as RACFieldError,
} from "react-aria-components";

import { tv } from "../utils/tv";

/*
 * FormField is a layout shell that pairs a label, description, and error
 * slot with a single field child. When the field child is a RAC compound
 * (`TextField`, `NumberField`, `Checkbox`, `Select`, …) the `<Label>`,
 * `<Text slot="description">`, and `<FieldError>` inside auto-wire
 * `htmlFor` / `aria-describedby` / `aria-errormessage` via RAC's slot
 * contexts — no manual `htmlFor` plumbing required.
 *
 * When the field child is a plain `<Input>` / `<Textarea>` (no enclosing
 * TextField), we fall back to the legacy behavior: consumers pass
 * `htmlFor` explicitly and we render a raw `<label>`. This keeps existing
 * callsites working during the migration.
 */

const formField = tv({
  slots: {
    root: "flex flex-col gap-s-2",
    label: "font-mono text-mono-sm uppercase tracking-tactical",
    description: "font-mono text-mono-sm text-ink-dim leading-[1.5]",
    error: "font-mono text-mono-sm text-event-red leading-[1.5]",
  },
  variants: {
    tone: {
      default: { label: "text-ink-dim" },
      auth: { label: "text-ink-hi" },
    },
  },
  defaultVariants: { tone: "default" },
});

export interface FormFieldProps {
  children: React.ReactNode;
  label?: React.ReactNode;
  /**
   * Optional `for` target. Only used when the field child is NOT inside a
   * RAC compound (otherwise RAC handles label association automatically).
   */
  htmlFor?: string;
  description?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  tone?: "default" | "auth";
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
  className,
  labelClassName,
  descriptionClassName,
  errorClassName,
}: FormFieldProps) {
  const slots = formField({ tone });

  return (
    <div className={slots.root({ className })}>
      {label ? (
        htmlFor ? (
          // Plain-input mode: render a raw <label htmlFor>.
          <label
            htmlFor={htmlFor}
            className={slots.label({ className: labelClassName })}
          >
            {label}
            {required ? (
              <span className="ml-[4px] text-event-red">*</span>
            ) : null}
          </label>
        ) : (
          // Compound mode: RAC's <Label> picks up the LabelContext from
          // the enclosing TextField / NumberField / etc.
          <RACLabel className={slots.label({ className: labelClassName })}>
            {label}
            {required ? (
              <span className="ml-[4px] text-event-red">*</span>
            ) : null}
          </RACLabel>
        )
      ) : null}

      {children}

      {description ? (
        <RACText
          slot="description"
          className={slots.description({ className: descriptionClassName })}
        >
          {description}
        </RACText>
      ) : null}

      {error ? (
        // FieldError pulls its message from a RAC FieldErrorContext when
        // inside a compound. Passing children lets us also drive it
        // manually from the consumer's validation state.
        <RACFieldError className={slots.error({ className: errorClassName })}>
          {error}
        </RACFieldError>
      ) : null}
    </div>
  );
}
