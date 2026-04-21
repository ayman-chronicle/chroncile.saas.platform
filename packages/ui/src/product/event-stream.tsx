"use client";

import * as React from "react";
import { Pressable } from "react-aria-components";

import { tv } from "../utils/tv";
import { EventRow, type EventRowProps, type EventLane } from "./event-row";

export interface EventStreamItem
  extends Omit<EventRowProps, "selected" | "lane"> {
  id: string;
  lane: EventLane;
}

export interface EventStreamProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
  items: EventStreamItem[];
  /** Id of the highlighted row. Only one row highlights at a time. */
  selectedId?: string;
  onSelect?: (id: string) => void;
  /** Optional day separator rendered above the first item. */
  daySeparator?: React.ReactNode;
}

const streamStyles = tv({
  slots: {
    root:
      "relative flex-1 overflow-auto py-s-2 pb-s-5 " +
      "before:absolute before:left-[86px] before:top-0 before:bottom-0 " +
      "before:w-px before:bg-hairline before:content-['']",
    daySep:
      "relative flex items-center gap-s-3 px-s-6 pl-[110px] pt-s-5 pb-s-2 " +
      "font-mono text-mono-sm uppercase tracking-eyebrow text-ink-dim " +
      "before:content-[''] after:ml-s-3 after:h-px after:flex-1 " +
      "after:bg-hairline after:content-['']",
  },
});

/**
 * EventStream — the vertical event rail. A single hairline spine runs
 * down the center, each row hosts a colored lane dot. `selectedId`
 * marks the single hot row; nothing else glows.
 *
 * When `onSelect` is provided, each row is wrapped in RAC's `Pressable`
 * so press semantics (mouse + keyboard + touch) are handled correctly
 * without manual `onKeyDown` plumbing.
 */
export function EventStream({
  items,
  selectedId,
  onSelect,
  daySeparator,
  className,
  ...props
}: EventStreamProps) {
  const slots = streamStyles({});
  return (
    <div className={`${slots.root()}${className ? ` ${className}` : ""}`} {...props}>
      {daySeparator ? (
        <div className={slots.daySep()}>{daySeparator}</div>
      ) : null}
      {items.map((it) => {
        const { id, ...rowProps } = it;
        const row = (
          <EventRow
            {...rowProps}
            selected={selectedId === id}
            role={onSelect ? "button" : undefined}
            aria-pressed={onSelect ? selectedId === id : undefined}
            tabIndex={onSelect ? 0 : undefined}
          />
        );
        if (!onSelect) return <React.Fragment key={id}>{row}</React.Fragment>;
        return (
          <Pressable key={id} onPress={() => onSelect(id)}>
            {row}
          </Pressable>
        );
      })}
    </div>
  );
}
