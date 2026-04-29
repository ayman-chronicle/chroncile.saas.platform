"use client";

/*
 * Combobox — a text input paired with a filterable listbox.
 *
 *   <Combobox
 *     placeholder="Pick a source"
 *     defaultSelectedKey="intercom"
 *     onSelectionChange={setValue}
 *   >
 *     <ComboboxItem id="intercom">Intercom</ComboboxItem>
 *     <ComboboxItem id="shopify">Shopify</ComboboxItem>
 *   </Combobox>
 *
 * Uses native input/button semantics and a lightweight popover list.
 */

import * as React from "react";

import type { VariantProps } from "class-variance-authority";
import { cn } from "../utils/cn";
import { useResolvedChromeDensity } from "../theme/chrome-style-context";
import {
  comboboxButtonVariants,
  comboboxEmptyVariants,
  comboboxInputVariants,
  comboboxInputWrapperVariants,
  comboboxItemVariants,
  comboboxListboxVariants,
  comboboxPopoverVariants,
  comboboxRootVariants,
  comboboxSectionHeaderVariants,
  comboboxSectionVariants,
} from "./shadcn";

export type ComboboxDensity = "compact" | "brand";

type ComboboxVariantProps = VariantProps<typeof comboboxInputVariants>;

export interface ComboboxProps
  extends
    Omit<React.HTMLAttributes<HTMLDivElement>, "className" | "children" | "onChange">,
    ComboboxVariantProps {
  className?: string;
  density?: ComboboxDensity;
  classNames?: {
    root?: string;
    input?: string;
    popover?: string;
    listbox?: string;
  };
  placeholder?: string;
  emptyMessage?: React.ReactNode;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  selectedKey?: string;
  defaultSelectedKey?: string;
  onSelectionChange?: (value: string) => void;
  children: React.ReactNode;
}

const ComboboxDensityContext = React.createContext<ComboboxDensity | undefined>(
  undefined,
);
const ComboboxSelectionContext = React.createContext<{
  value?: string;
  onSelect?: (value: string, label: React.ReactNode) => void;
}>({});

export function Combobox({
  className,
  classNames,
  placeholder,
  variant = "default",
  invalid = false,
  density: densityProp,
  emptyMessage = "No matches",
  value,
  defaultValue = "",
  onValueChange,
  selectedKey,
  defaultSelectedKey,
  onSelectionChange,
  children,
  ...rest
}: ComboboxProps) {
  const density = useResolvedChromeDensity(densityProp);
  const [open, setOpen] = React.useState(false);
  const resolvedValue = value ?? selectedKey;
  const resolvedDefaultValue = defaultValue || defaultSelectedKey || "";
  const [inputValue, setInputValue] = React.useState(resolvedDefaultValue);
  const currentValue = resolvedValue ?? inputValue;

  const setValue = React.useCallback(
    (next: string) => {
      if (value === undefined) setInputValue(next);
      onValueChange?.(next);
      onSelectionChange?.(next);
    },
    [onSelectionChange, onValueChange, value]
  );

  return (
    <div
      {...rest}
      data-density={density}
      className={cn(comboboxRootVariants(), classNames?.root, className)}
    >
      <div className={comboboxInputWrapperVariants()}>
        <input
          value={currentValue}
          onChange={(event) => {
            setValue(event.currentTarget.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={cn(
            comboboxInputVariants({ density, variant, invalid }),
            classNames?.input
          )}
        />
        <button
          type="button"
          onClick={() => setOpen((next) => !next)}
          className={comboboxButtonVariants({ density })}
          aria-label="Toggle options"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
            <path
              d="m19.5 8.25-7.5 7.5-7.5-7.5"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      {open ? (
      <div
        className={cn(
          comboboxPopoverVariants({ density }),
          "absolute z-50 mt-[4px]",
          classNames?.popover
        )}
      >
        <ComboboxDensityContext.Provider value={density}>
          <ComboboxSelectionContext.Provider
            value={{
              value: currentValue,
              onSelect: (next, label) => {
                setValue(typeof label === "string" ? label : next);
                setOpen(false);
              },
            }}
          >
            <div role="listbox" className={cn(comboboxListboxVariants(), classNames?.listbox)}>
              {children ? (
                children
              ) : (
                <div className={comboboxEmptyVariants({ density })}>
                  {emptyMessage}
                </div>
              )}
            </div>
          </ComboboxSelectionContext.Provider>
        </ComboboxDensityContext.Provider>
      </div>
      ) : null}
    </div>
  );
}

export interface ComboboxItemProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "value"> {
  className?: string;
  value?: string;
  id?: string;
}

export function ComboboxItem({
  className,
  value,
  id,
  onClick,
  children,
  ...props
}: ComboboxItemProps) {
  const ctxDensity = React.useContext(ComboboxDensityContext);
  const selection = React.useContext(ComboboxSelectionContext);
  const density = useResolvedChromeDensity(ctxDensity);
  const itemValue = value ?? id ?? "";
  const selected = selection.value === itemValue;

  return (
    <button
      {...props}
      type="button"
      role="option"
      aria-selected={selected}
      data-selected={selected || undefined}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) selection.onSelect?.(itemValue, children);
      }}
      className={cn(comboboxItemVariants({ density }), className)}
    >
      {children}
    </button>
  );
}

export interface ComboboxSectionProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "className" | "children" | "title"> {
  className?: string;
  title?: React.ReactNode;
  children?: React.ReactNode;
}

export function ComboboxSection({
  className,
  title,
  children,
  ...rest
}: ComboboxSectionProps) {
  const ctxDensity = React.useContext(ComboboxDensityContext);
  const density = useResolvedChromeDensity(ctxDensity);
  return (
    <div
      {...rest}
      role="group"
      className={comboboxSectionVariants({ className })}
    >
      {title ? (
        <div className={comboboxSectionHeaderVariants({ density })}>
          {title}
        </div>
      ) : null}
      {children as React.ReactNode}
    </div>
  );
}
