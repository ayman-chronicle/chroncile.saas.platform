import * as React from "react";
import { tv, type VariantProps } from "../utils/tv";
import { StatusDot, type StatusDotVariant } from "../primitives/status-dot";

/**
 * EventRow — one row on the event stream. `time`, a lane-colored dot,
 * a mono `topic` with italicized verb, a body preview, and a right-side
 * `source` label.
 *
 * Selection is expressed through `selected`; only selected rows get the
 * ember accent — the "one hot surface" principle, enforced in API shape
 * rather than leaving it to callers.
 */
export type EventLane = Extract<
  StatusDotVariant,
  "teal" | "amber" | "green" | "orange" | "pink" | "violet" | "red"
>;

const eventRow = tv({
  base:
    "relative grid grid-cols-[68px_18px_1fr_90px] items-start gap-s-4 px-s-6 " +
    "py-[10px] transition-colors duration-fast ease-out outline-none " +
    "data-[hovered=true]:bg-row-hover " +
    "data-[focus-visible=true]:outline data-[focus-visible=true]:outline-1 " +
    "data-[focus-visible=true]:-outline-offset-1 data-[focus-visible=true]:outline-ember",
  variants: {
    selected: {
      true:
        "bg-row-active " +
        "before:absolute before:inset-0 before:border-l-2 before:border-ember before:content-['']",
      false: "hover:bg-row-hover",
    },
  },
  defaultVariants: { selected: false },
});

type EventRowVariantProps = VariantProps<typeof eventRow>;

export interface EventRowProps
  extends React.HTMLAttributes<HTMLDivElement>,
    EventRowVariantProps {
  time: React.ReactNode;
  lane: EventLane;
  topic: React.ReactNode;
  /** Optional italicized verb in Kalice style — `agent.tool.<em>invoke</em>`. */
  verb?: React.ReactNode;
  preview?: React.ReactNode;
  source?: React.ReactNode;
  selected?: boolean;
}

export function EventRow({
  time,
  lane,
  topic,
  verb,
  preview,
  source,
  selected = false,
  className,
  ...props
}: EventRowProps) {
  return (
    <div
      className={eventRow({ selected, className })}
      data-selected={selected || undefined}
      {...props}
    >
      <span className="pt-[2px] font-mono text-mono-sm text-ink-dim tracking-mono">
        {time}
      </span>
      <StatusDot
        variant={lane}
        halo
        className="mt-[3px] border-[2px] border-surface-00 box-content"
      />
      <div className="flex min-w-0 flex-col gap-[4px]">
        <div className="font-mono text-mono-lg text-ink-hi">
          {topic}
          {verb ? (
            <>
              .<em className="not-italic text-ink-dim">{verb}</em>
            </>
          ) : null}
        </div>
        {preview ? (
          <div
            className="overflow-hidden font-sans text-[12.5px] font-light leading-[1.4] text-ink-lo"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 1,
              WebkitBoxOrient: "vertical",
            }}
          >
            {preview}
          </div>
        ) : null}
      </div>
      {source ? (
        <span className="pt-[2px] text-right font-mono text-mono-sm lowercase tracking-mono text-ink-dim">
          {source}
        </span>
      ) : null}
    </div>
  );
}
