"use client";

/*
 * Accordion — RAC's Disclosure + DisclosureGroup. An Accordion is a
 * DisclosureGroup with `allowsMultipleExpanded` controlling single vs
 * multi expand. Each item is a Disclosure with a Heading + Button trigger
 * and a DisclosurePanel body.
 *
 *   <Accordion>
 *     <AccordionItem id="intro" title="Introduction">…</AccordionItem>
 *     <AccordionItem id="rules" title="Rules">…</AccordionItem>
 *   </Accordion>
 */

import * as React from "react";
import {
  DisclosureGroup as RACDisclosureGroup,
  Disclosure as RACDisclosure,
  DisclosurePanel as RACDisclosurePanel,
  Button as RACButton,
  Heading as RACHeading,
  type DisclosureGroupProps as RACDisclosureGroupProps,
  type DisclosureProps as RACDisclosureProps,
} from "react-aria-components";

import { tv } from "../utils/tv";
import { composeTwRenderProps } from "../utils/compose";

const accordionStyles = tv({
  slots: {
    group:
      "flex flex-col divide-y divide-hairline rounded-md border border-hairline " +
      "bg-surface-01",
    item: "outline-none",
    header: "",
    trigger:
      "flex w-full items-center justify-between gap-s-3 px-s-4 py-s-3 " +
      "font-mono text-mono uppercase tracking-tactical text-ink-lo " +
      "transition-colors duration-fast ease-out outline-none " +
      "data-[hovered=true]:text-ink-hi data-[hovered=true]:bg-surface-02 " +
      "data-[focus-visible=true]:outline data-[focus-visible=true]:outline-1 " +
      "data-[focus-visible=true]:outline-ember",
    chevron:
      "h-4 w-4 shrink-0 text-ink-dim transition-transform duration-fast ease-out",
    panel:
      "px-s-4 pb-s-4 pt-0 text-body-sm text-ink-lo outline-none",
  },
});

export interface AccordionProps
  extends Omit<RACDisclosureGroupProps, "className" | "children"> {
  className?: string;
  children: React.ReactNode;
}

export function Accordion({
  className,
  children,
  ...rest
}: AccordionProps) {
  const slots = accordionStyles({});
  return (
    <RACDisclosureGroup
      {...rest}
      className={composeTwRenderProps(className, slots.group())}
    >
      {children}
    </RACDisclosureGroup>
  );
}

export interface AccordionItemProps
  extends Omit<RACDisclosureProps, "className" | "children"> {
  className?: string;
  title: React.ReactNode;
  children: React.ReactNode;
}

export function AccordionItem({
  className,
  title,
  children,
  ...rest
}: AccordionItemProps) {
  const slots = accordionStyles({});
  return (
    <RACDisclosure
      {...rest}
      className={composeTwRenderProps(className, slots.item())}
    >
      {({ isExpanded }) => (
        <>
          <RACHeading className={slots.header()}>
            <RACButton slot="trigger" className={slots.trigger()}>
              {title}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                style={{
                  transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                }}
                className={slots.chevron()}
              >
                <path
                  d="m19.5 8.25-7.5 7.5-7.5-7.5"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </RACButton>
          </RACHeading>
          <RACDisclosurePanel className={slots.panel()}>
            {children}
          </RACDisclosurePanel>
        </>
      )}
    </RACDisclosure>
  );
}
