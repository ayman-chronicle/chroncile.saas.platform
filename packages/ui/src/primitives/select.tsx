"use client";

/*
 * RAC-based Select compound.
 *
 * Usage:
 *
 *   <Select selectedKey={value} onSelectionChange={setValue} placeholder="…">
 *     <SelectItem id="intercom">Intercom</SelectItem>
 *     <SelectItem id="shopify">Shopify</SelectItem>
 *     <SelectSection title="Commerce">
 *       <SelectItem id="stripe">Stripe</SelectItem>
 *     </SelectSection>
 *   </Select>
 *
 * Provides typeahead, arrow/home/end navigation, proper portaled popover,
 * and automatic Label / FieldError / Description wiring when placed inside
 * a `FormField` (via RAC's slot contexts). For the legacy native-select
 * API (`<option>` children, `value`, `onChange(e)`), use `NativeSelect`.
 */

import * as React from "react";
import {
  Select as RACSelect,
  SelectValue as RACSelectValue,
  type SelectProps as RACSelectProps,
  Button as RACButton,
  Popover as RACPopover,
  type PopoverProps as RACPopoverProps,
  ListBox as RACListBox,
  ListBoxItem as RACListBoxItem,
  ListBoxSection as RACListBoxSection,
  type ListBoxItemProps as RACListBoxItemProps,
  type ListBoxSectionProps as RACListBoxSectionProps,
  Header as RACHeader,
  Collection as RACCollection,
} from "react-aria-components";

import { tv, type VariantProps } from "../utils/tv";
import { composeTwRenderProps } from "../utils/compose";

const selectStyles = tv({
  slots: {
    root: "flex flex-col gap-s-1 w-full",
    trigger:
      "flex w-full items-center justify-between gap-s-2 rounded-sm border " +
      "bg-surface-00 px-s-3 py-s-2 pr-[32px] font-mono text-mono-lg text-ink " +
      "transition-colors duration-fast ease-out outline-none text-left " +
      "data-[hovered=true]:border-ink-dim " +
      "data-[focus-visible=true]:border-ember data-[focus-visible=true]:outline " +
      "data-[focus-visible=true]:outline-1 data-[focus-visible=true]:outline-ember " +
      "data-[open=true]:border-ember " +
      "data-[disabled=true]:opacity-50 data-[disabled=true]:cursor-not-allowed",
    value:
      "truncate text-ink data-[placeholder=true]:text-ink-faint",
    chevron:
      "pointer-events-none absolute right-s-3 top-1/2 h-4 w-4 -translate-y-1/2 " +
      "text-ink-dim transition-transform duration-fast ease-out",
    popover:
      "z-50 min-w-[var(--trigger-width)] rounded-sm border border-hairline-strong " +
      "bg-surface-02 p-s-1 shadow-panel outline-none " +
      "data-[entering=true]:animate-in data-[entering=true]:fade-in " +
      "data-[exiting=true]:animate-out data-[exiting=true]:fade-out",
    listbox: "max-h-[320px] overflow-auto outline-none",
    item:
      "relative cursor-pointer select-none rounded-xs px-s-2 py-s-2 " +
      "font-mono text-mono-lg text-ink " +
      "data-[focused=true]:bg-surface-03 " +
      "data-[selected=true]:text-ink-hi data-[selected=true]:bg-surface-03 " +
      "data-[disabled=true]:opacity-50 data-[disabled=true]:cursor-not-allowed outline-none",
    section: "py-s-1",
    sectionHeader:
      "px-s-2 pt-s-2 pb-s-1 font-mono text-mono-sm uppercase tracking-tactical text-ink-dim",
  },
  variants: {
    variant: {
      default: { trigger: "border-hairline-strong" },
      auth: {
        trigger:
          "bg-transparent border-hairline-strong text-ink-hi " +
          "data-[focus-visible=true]:border-ink-hi",
      },
    },
    invalid: {
      true: {
        trigger:
          "border-event-red data-[focus-visible=true]:border-event-red data-[open=true]:border-event-red",
      },
    },
  },
  defaultVariants: { variant: "default" },
});

type SelectVariantProps = VariantProps<typeof selectStyles>;

export interface SelectProps<T extends object = object>
  extends Omit<RACSelectProps<T>, "className">,
    SelectVariantProps {
  className?: string;
  placeholder?: string;
  /** Optional controlled open state. */
  classNames?: {
    root?: string;
    trigger?: string;
    value?: string;
    popover?: string;
    listbox?: string;
  };
  /** Popover placement — forwarded to the underlying RAC Popover. */
  placement?: RACPopoverProps["placement"];
  children: React.ReactNode;
}

export function Select<T extends object = object>({
  children,
  placeholder,
  variant = "default",
  invalid = false,
  className,
  classNames,
  placement = "bottom start",
  ...rest
}: SelectProps<T>) {
  const slots = selectStyles({ variant, invalid });

  return (
    <RACSelect
      {...rest}
      className={composeTwRenderProps(className, slots.root())}
    >
      <div className="relative">
        <RACButton
          className={composeTwRenderProps(
            classNames?.trigger,
            slots.trigger(),
          )}
        >
          <RACSelectValue className={slots.value({ className: classNames?.value })}>
            {({ isPlaceholder, selectedText }) =>
              isPlaceholder ? (placeholder ?? "Select…") : selectedText
            }
          </RACSelectValue>
        </RACButton>
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          className={slots.chevron()}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m19.5 8.25-7.5 7.5-7.5-7.5"
          />
        </svg>
      </div>
      <RACPopover
        placement={placement}
        className={composeTwRenderProps(classNames?.popover, slots.popover())}
      >
        <RACListBox
          className={composeTwRenderProps(classNames?.listbox, slots.listbox())}
        >
          {children}
        </RACListBox>
      </RACPopover>
    </RACSelect>
  );
}

export interface SelectItemProps<T extends object = object>
  extends Omit<RACListBoxItemProps<T>, "className"> {
  className?: string;
}

export function SelectItem<T extends object = object>({
  className,
  ...props
}: SelectItemProps<T>) {
  const slots = selectStyles({});
  return (
    <RACListBoxItem
      {...(props as RACListBoxItemProps<T>)}
      className={composeTwRenderProps(className, slots.item())}
    />
  );
}

export interface SelectSectionProps<T extends object>
  extends Omit<RACListBoxSectionProps<T>, "className" | "children"> {
  className?: string;
  /** Section title rendered as a non-interactive group header. */
  title?: React.ReactNode;
  items?: Iterable<T>;
  children?: React.ReactNode | ((item: T) => React.ReactElement);
}

export function SelectSection<T extends object>({
  className,
  title,
  items,
  children,
  ...rest
}: SelectSectionProps<T>) {
  const slots = selectStyles({});
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
