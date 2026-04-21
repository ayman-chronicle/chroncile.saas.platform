"use client";

/*
 * Tabs — horizontally arranged, keyboard-navigable (arrow/home/end)
 * content panels. Automatic panel/tab id linking via RAC.
 *
 *   <Tabs defaultSelectedKey="events">
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
import {
  Tabs as RACTabs,
  TabList as RACTabList,
  Tab as RACTab,
  TabPanel as RACTabPanel,
  type TabsProps as RACTabsProps,
  type TabListProps as RACTabListProps,
  type TabProps as RACTabProps,
  type TabPanelProps as RACTabPanelProps,
} from "react-aria-components";

import { tv } from "../utils/tv";
import { composeTwRenderProps } from "../utils/compose";

const tabsStyles = tv({
  slots: {
    root: "flex flex-col gap-s-4 data-[orientation=vertical]:flex-row",
    list:
      "flex gap-s-2 border-b border-hairline " +
      "data-[orientation=vertical]:flex-col data-[orientation=vertical]:border-b-0 " +
      "data-[orientation=vertical]:border-r data-[orientation=vertical]:gap-s-1",
    tab:
      "relative cursor-pointer px-s-3 py-s-2 font-mono text-mono uppercase tracking-tactical " +
      "text-ink-lo outline-none transition-colors duration-fast ease-out " +
      "data-[hovered=true]:text-ink-hi " +
      "data-[selected=true]:text-ink-hi " +
      "data-[selected=true]:after:absolute data-[selected=true]:after:inset-x-0 " +
      "data-[selected=true]:after:-bottom-px data-[selected=true]:after:h-[2px] " +
      "data-[selected=true]:after:bg-ember " +
      "data-[focus-visible=true]:outline data-[focus-visible=true]:outline-1 " +
      "data-[focus-visible=true]:outline-ember " +
      "data-[disabled=true]:opacity-50 data-[disabled=true]:cursor-not-allowed",
    panel: "outline-none",
  },
});

export interface TabsProps extends Omit<RACTabsProps, "className" | "children"> {
  className?: string;
  children: React.ReactNode;
}

export function Tabs({ className, children, ...rest }: TabsProps) {
  const slots = tabsStyles({});
  return (
    <RACTabs
      {...rest}
      className={composeTwRenderProps(className, slots.root())}
    >
      {children}
    </RACTabs>
  );
}

export interface TabListProps<T extends object = object>
  extends Omit<RACTabListProps<T>, "className" | "children"> {
  className?: string;
  children: React.ReactNode;
}

export function TabList<T extends object = object>({
  className,
  children,
  ...rest
}: TabListProps<T>) {
  const slots = tabsStyles({});
  return (
    <RACTabList
      {...(rest as RACTabListProps<T>)}
      className={composeTwRenderProps(className, slots.list())}
    >
      {children as React.ReactNode}
    </RACTabList>
  );
}

export interface TabProps extends Omit<RACTabProps, "className"> {
  className?: string;
}

export function Tab({ className, ...rest }: TabProps) {
  const slots = tabsStyles({});
  return (
    <RACTab
      {...rest}
      className={composeTwRenderProps(className, slots.tab())}
    />
  );
}

export interface TabPanelProps extends Omit<RACTabPanelProps, "className"> {
  className?: string;
}

export function TabPanel({ className, ...rest }: TabPanelProps) {
  const slots = tabsStyles({});
  return (
    <RACTabPanel
      {...rest}
      className={composeTwRenderProps(className, slots.panel())}
    />
  );
}
