"use client";

/*
 * Accordion — Radix Accordion with Chronicle density variants.
 *
 *   <Accordion>
 *     <AccordionItem id="intro" title="Introduction">…</AccordionItem>
 *     <AccordionItem id="rules" title="Rules">…</AccordionItem>
 *   </Accordion>
 */

import * as React from "react";
import { Accordion as AccordionPrimitive } from "radix-ui";

import { cn } from "../utils/cn";
import { useResolvedChromeDensity } from "../theme/chrome-style-context";
import {
  accordionChevronVariants,
  accordionGroupVariants,
  accordionHeaderVariants,
  accordionItemVariants,
  accordionPanelVariants,
  accordionTriggerVariants,
} from "./shadcn";

export type AccordionDensity = "compact" | "brand";

/**
 * Local density context so the parent `<Accordion>` can pin a flavor
 * for its children without relying on the global `ChromeStyleProvider`
 * (e.g. an editorial accordion inside a product surface, or vice versa).
 */
const AccordionDensityContext = React.createContext<AccordionDensity | undefined>(
  undefined
);

export interface AccordionProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "className" | "children" | "defaultValue" | "onChange"
> {
  className?: string;
  /**
   * Density flavor.
   *   `"compact"` — Linear-density (sans medium, rounded-l, tighter padding).
   *   `"brand"`   — editorial mono-uppercase trigger.
   * Inherits from the nearest `ChromeStyleProvider` when omitted.
   */
  density?: AccordionDensity;
  type?: "single" | "multiple";
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  collapsible?: boolean;
  defaultExpandedKeys?: string[];
  allowsMultipleExpanded?: boolean;
  children: React.ReactNode;
}

export function Accordion({
  className,
  density: densityProp,
  children,
  type = "single",
  value,
  defaultValue,
  onValueChange,
  collapsible = true,
  defaultExpandedKeys,
  allowsMultipleExpanded,
  ...rest
}: AccordionProps) {
  const density = useResolvedChromeDensity(densityProp);
  const resolvedType = allowsMultipleExpanded ? "multiple" : type;
  const resolvedDefaultValue = defaultValue ?? defaultExpandedKeys;
  const commonProps = {
    ...rest,
    "data-density": density,
    className: cn(accordionGroupVariants({ density }), className),
  };

  return (
    <AccordionDensityContext.Provider value={density}>
      {resolvedType === "multiple" ? (
        <AccordionPrimitive.Root
          {...(commonProps as object)}
          type="multiple"
          value={Array.isArray(value) ? value : undefined}
          defaultValue={Array.isArray(resolvedDefaultValue) ? resolvedDefaultValue : undefined}
          onValueChange={onValueChange as ((value: string[]) => void) | undefined}
        >
          {children}
        </AccordionPrimitive.Root>
      ) : (
        <AccordionPrimitive.Root
          {...(commonProps as object)}
          type="single"
          collapsible={collapsible}
          value={typeof value === "string" ? value : undefined}
          defaultValue={
            typeof resolvedDefaultValue === "string"
              ? resolvedDefaultValue
              : resolvedDefaultValue?.[0]
          }
          onValueChange={onValueChange as ((value: string) => void) | undefined}
        >
          {children}
        </AccordionPrimitive.Root>
      )}
    </AccordionDensityContext.Provider>
  );
}

export interface AccordionItemProps extends Omit<
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>,
  "className" | "children" | "title" | "value"
> {
  className?: string;
  title: React.ReactNode;
  value?: string;
  id?: string;
  children: React.ReactNode;
}

export function AccordionItem({
  className,
  title,
  children,
  value,
  id,
  ...rest
}: AccordionItemProps) {
  const parentDensity = React.useContext(AccordionDensityContext);
  const density = useResolvedChromeDensity(parentDensity);
  const fallbackValue = React.useId();

  return (
    <AccordionPrimitive.Item
      {...rest}
      value={value ?? id ?? fallbackValue}
      className={cn(accordionItemVariants(), className)}
    >
      <AccordionPrimitive.Header className={accordionHeaderVariants()}>
        <AccordionPrimitive.Trigger
          className={accordionTriggerVariants({
            density,
            className: "group",
          })}
        >
          {title}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className={accordionChevronVariants({
              density,
              className: "group-data-[state=open]:rotate-180",
            })}
          >
            <path
              d="m19.5 8.25-7.5 7.5-7.5-7.5"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </AccordionPrimitive.Trigger>
      </AccordionPrimitive.Header>
      <AccordionPrimitive.Content className={accordionPanelVariants({ density })}>
        {children}
      </AccordionPrimitive.Content>
    </AccordionPrimitive.Item>
  );
}
