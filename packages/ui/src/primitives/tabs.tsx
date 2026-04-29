"use client";

/*
 * Tabs — horizontally arranged, keyboard-navigable (arrow/home/end)
 * content panels backed by Radix Tabs.
 *
 *   <Tabs defaultValue="events">
 *     <TabList aria-label="Dashboard">
 *       <Tab id="events">Events</Tab>
 *       <Tab id="runs">Runs</Tab>
 *       <Tab id="rules">Rules</Tab>
 *     </TabList>
 *     <TabPanel id="events">…</TabPanel>
 *     <TabPanel id="runs">…</TabPanel>
 *     <TabPanel id="rules">…</TabPanel>
 *   </Tabs>
 */

import * as React from "react";
import { Tabs as TabsPrimitive } from "radix-ui";

import { cn } from "../utils/cn";
import { useResolvedChromeDensity } from "../theme/chrome-style-context";
import {
  tabPanelVariants,
  tabVariants,
  tabsListVariants,
  tabsRootVariants,
} from "./shadcn";

const TabsDensityContext = React.createContext<"compact" | "brand" | undefined>(
  undefined,
);

export interface TabsProps extends Omit<
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>,
  "className" | "children"
> {
  className?: string;
  density?: "compact" | "brand";
  children: React.ReactNode;
  selectedKey?: string;
  defaultSelectedKey?: string;
  onSelectionChange?: (key: string) => void;
  ref?: React.Ref<HTMLDivElement>;
}

export function Tabs({
  className,
  density: densityProp,
  children,
  value,
  defaultValue,
  onValueChange,
  selectedKey,
  defaultSelectedKey,
  onSelectionChange,
  ref,
  ...rest
}: TabsProps) {
  const density = useResolvedChromeDensity(densityProp);
  return (
    <TabsPrimitive.Root
      {...rest}
      ref={ref}
      value={value ?? selectedKey}
      defaultValue={defaultValue ?? defaultSelectedKey}
      onValueChange={(next) => {
        onValueChange?.(next);
        onSelectionChange?.(next);
      }}
      data-density={density}
      className={cn(tabsRootVariants({ density }), className)}
    >
      <TabsDensityContext.Provider value={density}>
        {children}
      </TabsDensityContext.Provider>
    </TabsPrimitive.Root>
  );
}

export interface TabListProps extends Omit<
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>,
  "className" | "children"
> {
  className?: string;
  children: React.ReactNode;
  ref?: React.Ref<HTMLDivElement>;
}

export function TabList({
  className,
  children,
  ref,
  ...rest
}: TabListProps) {
  const ctxDensity = React.useContext(TabsDensityContext);
  const density = useResolvedChromeDensity(ctxDensity);
  return (
    <TabsPrimitive.List
      {...rest}
      ref={ref}
      className={cn(tabsListVariants({ density }), className)}
    >
      {children as React.ReactNode}
    </TabsPrimitive.List>
  );
}

export interface TabProps extends Omit<
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>,
  "className" | "value"
> {
  className?: string;
  value?: string;
  id?: string;
  ref?: React.Ref<HTMLButtonElement>;
}

export function Tab({ className, ref, value, id, ...rest }: TabProps) {
  const ctxDensity = React.useContext(TabsDensityContext);
  const density = useResolvedChromeDensity(ctxDensity);
  return (
    <TabsPrimitive.Trigger
      {...rest}
      ref={ref}
      value={value ?? id ?? ""}
      className={cn(tabVariants({ density }), className)}
    />
  );
}

export interface TabPanelProps extends Omit<
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>,
  "className" | "value"
> {
  className?: string;
  value?: string;
  id?: string;
  ref?: React.Ref<HTMLDivElement>;
}

export function TabPanel({ className, ref, value, id, ...rest }: TabPanelProps) {
  return (
    <TabsPrimitive.Content
      {...rest}
      ref={ref}
      value={value ?? id ?? ""}
      className={cn(tabPanelVariants(), className)}
    />
  );
}
