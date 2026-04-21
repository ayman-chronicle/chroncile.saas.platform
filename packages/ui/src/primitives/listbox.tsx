"use client";

/*
 * Listbox — standalone selection list (no trigger, no popover). Use for
 * in-flow pickers where the options should always be visible (detail
 * panels, settings sheets). For a closed-by-default picker use `Select`.
 */

import * as React from "react";
import {
  ListBox as RACListBox,
  ListBoxItem as RACListBoxItem,
  ListBoxSection as RACListBoxSection,
  Header as RACHeader,
  Collection as RACCollection,
  type ListBoxProps as RACListBoxProps,
  type ListBoxItemProps as RACListBoxItemProps,
  type ListBoxSectionProps as RACListBoxSectionProps,
} from "react-aria-components";

import { tv } from "../utils/tv";
import { composeTwRenderProps } from "../utils/compose";

const listboxStyles = tv({
  slots: {
    root:
      "flex flex-col rounded-sm border border-hairline bg-surface-01 p-s-1 " +
      "outline-none max-h-[320px] overflow-auto " +
      "data-[focus-visible=true]:outline data-[focus-visible=true]:outline-1 " +
      "data-[focus-visible=true]:outline-ember",
    item:
      "relative cursor-pointer select-none rounded-xs px-s-2 py-s-2 " +
      "font-mono text-mono-lg text-ink outline-none " +
      "data-[focused=true]:bg-surface-03 " +
      "data-[selected=true]:text-ink-hi data-[selected=true]:bg-surface-03 " +
      "data-[disabled=true]:opacity-50 data-[disabled=true]:cursor-not-allowed",
    section: "py-s-1",
    sectionHeader:
      "px-s-2 pt-s-2 pb-s-1 font-mono text-mono-sm uppercase tracking-tactical text-ink-dim",
  },
});

export interface ListboxProps<T extends object>
  extends Omit<RACListBoxProps<T>, "className" | "children"> {
  className?: string;
  children: React.ReactNode;
}

export function Listbox<T extends object>({
  className,
  children,
  ...rest
}: ListboxProps<T>) {
  const slots = listboxStyles({});
  return (
    <RACListBox
      {...(rest as RACListBoxProps<T>)}
      className={composeTwRenderProps(className, slots.root())}
    >
      {children as React.ReactNode}
    </RACListBox>
  );
}

export interface ListboxItemProps<T extends object = object>
  extends Omit<RACListBoxItemProps<T>, "className"> {
  className?: string;
}

export function ListboxItem<T extends object = object>({
  className,
  ...props
}: ListboxItemProps<T>) {
  const slots = listboxStyles({});
  return (
    <RACListBoxItem
      {...(props as RACListBoxItemProps<T>)}
      className={composeTwRenderProps(className, slots.item())}
    />
  );
}

export interface ListboxSectionProps<T extends object>
  extends Omit<RACListBoxSectionProps<T>, "className" | "children"> {
  className?: string;
  title?: React.ReactNode;
  items?: Iterable<T>;
  children?: React.ReactNode | ((item: T) => React.ReactElement);
}

export function ListboxSection<T extends object>({
  className,
  title,
  items,
  children,
  ...rest
}: ListboxSectionProps<T>) {
  const slots = listboxStyles({});
  return (
    <RACListBoxSection
      {...(rest as RACListBoxSectionProps<T>)}
      className={slots.section({ className })}
    >
      {title ? (
        <RACHeader className={slots.sectionHeader()}>{title}</RACHeader>
      ) : null}
      {items
        ? (
            <RACCollection items={items}>
              {children as (item: T) => React.ReactElement}
            </RACCollection>
          )
        : (children as React.ReactNode)}
    </RACListBoxSection>
  );
}
