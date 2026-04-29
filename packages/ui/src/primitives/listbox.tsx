"use client";

/*
 * Listbox — standalone selection list (no trigger, no popover). Use for
 * in-flow pickers where the options should always be visible (detail
 * panels, settings sheets). For a closed-by-default picker use `Select`.
 */

import * as React from "react";

import { cn } from "../utils/cn";
import { useResolvedChromeDensity } from "../theme/chrome-style-context";
import {
  listboxItemVariants,
  listboxRootVariants,
  listboxSectionHeaderVariants,
  listboxSectionVariants,
} from "./shadcn";

const ListboxDensityContext = React.createContext<"compact" | "brand" | undefined>(
  undefined,
);

export interface ListboxProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "className" | "children"> {
  className?: string;
  density?: "compact" | "brand";
  children: React.ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
  selectionMode?: string;
  defaultSelectedKeys?: Iterable<string>;
  selectedKeys?: Iterable<string>;
  onSelectionChange?: (keys: Set<string>) => void;
}

const ListboxValueContext = React.createContext<{
  value?: string;
  onValueChange?: (value: string) => void;
}>({});

export function Listbox({
  className,
  density: densityProp,
  children,
  value,
  onValueChange,
  selectedKeys,
  defaultSelectedKeys,
  onSelectionChange,
  selectionMode: _selectionMode,
  ...rest
}: ListboxProps) {
  const density = useResolvedChromeDensity(densityProp);
  const firstSelected = selectedKeys
    ? Array.from(selectedKeys)[0]
    : defaultSelectedKeys
      ? Array.from(defaultSelectedKeys)[0]
      : undefined;
  const resolvedValue = value ?? firstSelected;
  const handleValueChange = React.useCallback(
    (next: string) => {
      onValueChange?.(next);
      onSelectionChange?.(new Set([next]));
    },
    [onSelectionChange, onValueChange]
  );

  return (
    <ListboxDensityContext.Provider value={density}>
      <ListboxValueContext.Provider
        value={{ value: resolvedValue, onValueChange: handleValueChange }}
      >
      <div
        {...rest}
        role="listbox"
        data-density={density}
        className={cn(listboxRootVariants({ density }), className)}
      >
        {children as React.ReactNode}
      </div>
      </ListboxValueContext.Provider>
    </ListboxDensityContext.Provider>
  );
}

export interface ListboxItemProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "value"> {
  className?: string;
  value?: string;
  id?: string;
}

export function ListboxItem({
  className,
  value,
  id,
  onClick,
  ...props
}: ListboxItemProps) {
  const ctxDensity = React.useContext(ListboxDensityContext);
  const selection = React.useContext(ListboxValueContext);
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
        if (!event.defaultPrevented) selection.onValueChange?.(itemValue);
      }}
      className={cn(listboxItemVariants({ density }), className)}
    />
  );
}

export interface ListboxSectionProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "className" | "children" | "title"> {
  className?: string;
  title?: React.ReactNode;
  children?: React.ReactNode;
}

export function ListboxSection({
  className,
  title,
  children,
  ...rest
}: ListboxSectionProps) {
  const ctxDensity = React.useContext(ListboxDensityContext);
  const density = useResolvedChromeDensity(ctxDensity);
  return (
    <div
      {...rest}
      role="group"
      className={listboxSectionVariants({ className })}
    >
      {title ? (
        <div className={listboxSectionHeaderVariants({ density })}>
          {title}
        </div>
      ) : null}
      {children as React.ReactNode}
    </div>
  );
}
