"use client";

/*
 * SearchField — a text input with an auto-managed clear button and ESC
 * to clear.
 */

import * as React from "react";

import { cn } from "../utils/cn";
import { useResolvedChromeDensity } from "../theme/chrome-style-context";
import {
  searchFieldClearVariants,
  searchFieldIconVariants,
  searchFieldInputVariants,
  searchFieldRootVariants,
} from "./shadcn";

export type SearchFieldDensity = "compact" | "brand";

export interface SearchFieldProps {
  className?: string;
  placeholder?: string;
  density?: SearchFieldDensity;
  /** Controlled value. */
  value?: string;
  /** Fires with the latest value as the user types or clears. */
  onChange?: (value: string) => void;
  /** Uncontrolled initial value. */
  defaultValue?: string;
  /** Fires when the user submits (Enter). */
  onSubmit?: (value: string) => void;
  /** Fires when the clear button is pressed (after `onChange("")`). */
  onClear?: () => void;
  /** Required when no surrounding `<label>` is present. */
  "aria-label"?: string;
  "aria-labelledby"?: string;
  /** Form name (for use inside `<form>` POSTs). */
  name?: string;
  /** Disable input + clear button. */
  disabled?: boolean;
  autoFocus?: boolean;
  id?: string;
}

export function SearchField({
  className,
  placeholder,
  density: densityProp,
  value,
  onChange,
  defaultValue,
  onSubmit,
  onClear,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  name,
  disabled,
  autoFocus,
  id,
}: SearchFieldProps) {
  const density = useResolvedChromeDensity(densityProp);
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? "");
  const currentValue = value ?? internalValue;

  const setValue = React.useCallback(
    (next: string) => {
      if (value === undefined) setInternalValue(next);
      onChange?.(next);
    },
    [onChange, value]
  );

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.(currentValue);
      }}
      data-density={density}
      className={cn(searchFieldRootVariants({ density }), className)}
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className={searchFieldIconVariants({ density })}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
        />
      </svg>
      <input
        id={id}
        name={name}
        value={currentValue}
        onChange={(event) => setValue(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && currentValue) {
            setValue("");
            onClear?.();
          }
        }}
        disabled={disabled}
        autoFocus={autoFocus}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        placeholder={placeholder}
        className={searchFieldInputVariants({ density })}
      />
      <button
        type="button"
        disabled={disabled || !currentValue}
        onClick={() => {
          setValue("");
          onClear?.();
        }}
        className={searchFieldClearVariants({ density })}
        aria-label="Clear"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3">
          <path
            d="M6 18L18 6M6 6l12 12"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        </svg>
      </button>
    </form>
  );
}
