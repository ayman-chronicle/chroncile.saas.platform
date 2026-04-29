"use client";

/* Select compound backed by Radix Select. */

import * as React from "react";
import { Select as SelectPrimitive } from "radix-ui";

import type { VariantProps } from "class-variance-authority";
import { cn } from "../utils/cn";
import { useResolvedChromeDensity } from "../theme/chrome-style-context";
import {
  selectChevronVariants,
  selectItemVariants,
  selectListboxVariants,
  selectPopoverVariants,
  selectRootVariants,
  selectSectionHeaderVariants,
  selectSectionVariants,
  selectTriggerVariants,
  selectValueVariants,
} from "./shadcn";

export type SelectDensity = "compact" | "brand";

type SelectVariantProps = VariantProps<typeof selectTriggerVariants>;

export interface SelectProps
  extends Omit<
      React.ComponentPropsWithoutRef<typeof SelectPrimitive.Root>,
      "children"
    >,
    SelectVariantProps {
  className?: string;
  density?: SelectDensity;
  placeholder?: string;
  /** Optional controlled open state. */
  classNames?: {
    root?: string;
    trigger?: string;
    value?: string;
    popover?: string;
    listbox?: string;
  };
  children: React.ReactNode;
  selectedKey?: string;
  defaultSelectedKey?: string;
  onSelectionChange?: (key: string) => void;
}

const SelectDensityContext = React.createContext<SelectDensity | undefined>(
  undefined,
);

export function Select({
  children,
  placeholder,
  variant = "default",
  invalid = false,
  density: densityProp,
  className,
  classNames,
  value,
  defaultValue,
  onValueChange,
  selectedKey,
  defaultSelectedKey,
  onSelectionChange,
  ...rest
}: SelectProps) {
  const density = useResolvedChromeDensity(densityProp);

  return (
    <SelectPrimitive.Root
      {...rest}
      value={value ?? selectedKey}
      defaultValue={defaultValue ?? defaultSelectedKey}
      onValueChange={(next) => {
        onValueChange?.(next);
        onSelectionChange?.(next);
      }}
    >
      <div
        data-density={density}
        className={cn(selectRootVariants(), classNames?.root, className)}
      >
        <div className="relative">
          <SelectPrimitive.Trigger
            className={cn(
              selectTriggerVariants({ density, variant, invalid }),
              classNames?.trigger
            )}
          >
            <SelectPrimitive.Value
              placeholder={placeholder ?? "Select..."}
            className={selectValueVariants({
              density,
              className: classNames?.value,
            })}
            />
          </SelectPrimitive.Trigger>
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className={selectChevronVariants({ density })}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m19.5 8.25-7.5 7.5-7.5-7.5"
            />
          </svg>
        </div>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            className={cn(selectPopoverVariants({ density }), classNames?.popover)}
            position="popper"
          >
            <SelectDensityContext.Provider value={density}>
              <SelectPrimitive.Viewport
                className={cn(selectListboxVariants(), classNames?.listbox)}
              >
                {children}
              </SelectPrimitive.Viewport>
            </SelectDensityContext.Provider>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </div>
    </SelectPrimitive.Root>
  );
}

export interface SelectItemProps extends Omit<
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>,
  "className" | "value"
> {
  className?: string;
  value?: string;
  id?: string;
}

export function SelectItem({
  className,
  value,
  id,
  ...props
}: SelectItemProps) {
  const ctxDensity = React.useContext(SelectDensityContext);
  const density = useResolvedChromeDensity(ctxDensity);
  return (
    <SelectPrimitive.Item
      {...props}
      value={value ?? id ?? ""}
      className={cn(selectItemVariants({ density }), className)}
    >
      <SelectPrimitive.ItemText>{props.children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

export interface SelectSectionProps extends Omit<
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Group>,
  "className" | "children" | "title"
> {
  className?: string;
  /** Section title rendered as a non-interactive group header. */
  title?: React.ReactNode;
  children?: React.ReactNode;
}

export function SelectSection({
  className,
  title,
  children,
  ...rest
}: SelectSectionProps) {
  const ctxDensity = React.useContext(SelectDensityContext);
  const density = useResolvedChromeDensity(ctxDensity);
  return (
    <SelectPrimitive.Group
      {...rest}
      className={selectSectionVariants({ className })}
    >
      {title ? (
        <SelectPrimitive.Label className={selectSectionHeaderVariants({ density })}>
          {title}
        </SelectPrimitive.Label>
      ) : null}
      {children as React.ReactNode}
    </SelectPrimitive.Group>
  );
}
