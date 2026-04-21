"use client";

import * as React from "react";
import { cx } from "../utils/cx";

/**
 * Minimap — the event-stream minimap strip with a scrub track, optional
 * replay range window, and an ember playhead. Bars are computed
 * deterministically from seed values so the visual is stable.
 */
export interface MinimapBar {
  /** 0–100 height percentage. */
  height: number;
  /** Event lane color. Accepts any CSS color. */
  color: string;
  /** 0–1 opacity. */
  opacity?: number;
}

export interface MinimapProps extends React.HTMLAttributes<HTMLDivElement> {
  bars: MinimapBar[];
  /** 0–100 — position of the playhead. */
  playhead: number;
  /** Optional replay window — `[start, end]` as 0–100 percentages. */
  range?: [number, number];
  /** Content for the left/right readouts. */
  readoutLeft?: React.ReactNode;
  readoutRight?: React.ReactNode;
  /** Playback button hit-area. Pass null to hide. */
  onPlay?: () => void;
  playing?: boolean;
  /** Optional speed selector slot. */
  speed?: React.ReactNode;
}

export function Minimap({
  bars,
  playhead,
  range,
  readoutLeft,
  readoutRight,
  onPlay,
  playing = false,
  speed,
  className,
  ...props
}: MinimapProps) {
  const clamped = Math.max(0, Math.min(100, playhead));
  return (
    <div
      className={cx(
        "col-span-full flex h-[64px] items-center gap-s-3 border-t border-hairline bg-surface-01 px-s-6",
        className,
      )}
      {...props}
    >
      {onPlay !== undefined ? (
        <button
          type="button"
          onClick={onPlay}
          aria-label={playing ? "Pause" : "Play"}
          className="inline-flex h-[32px] w-[32px] items-center justify-center rounded-full border-0 bg-ink-hi text-[11px] text-[color:var(--c-btn-invert-fg)]"
        >
          {playing ? "⏸" : "▶"}
        </button>
      ) : null}
      {readoutLeft ? (
        <div className="whitespace-nowrap font-mono text-mono-lg tracking-mono text-ink-lo">
          {readoutLeft}
        </div>
      ) : null}
      <div className="relative flex h-[38px] flex-1 items-end overflow-hidden rounded-xs border border-hairline bg-surface-00">
        <div className="absolute inset-[4px] flex items-end gap-px">
          {bars.map((b, i) => (
            <span
              key={i}
              className="inline-block w-[2px]"
              style={{
                height: `${Math.max(0, Math.min(100, b.height))}%`,
                background: b.color,
                opacity: b.opacity ?? 1,
              }}
            />
          ))}
        </div>
        {range ? (
          <span
            className="absolute bottom-0 top-0 bg-[rgba(139,92,246,0.1)] border-l border-r border-event-violet"
            style={{
              left: `${range[0]}%`,
              width: `${Math.max(0, range[1] - range[0])}%`,
            }}
          />
        ) : null}
        <span
          className="pointer-events-none absolute bottom-0 top-0 w-[2px] bg-ember shadow-glow-ember"
          style={{ left: `${clamped}%` }}
        >
          <span className="absolute -top-[6px] -left-[5px] h-[12px] w-[12px] rounded-full bg-ember" />
        </span>
      </div>
      {readoutRight ? (
        <div className="whitespace-nowrap font-mono text-mono-lg tracking-mono text-ink-lo">
          {readoutRight}
        </div>
      ) : null}
      {speed}
    </div>
  );
}

/** Deterministic-ish fake bars used by stories and fixtures. */
export function generateMinimapBars(count = 260): MinimapBar[] {
  const colors = [
    "var(--c-event-teal)",
    "var(--c-event-amber)",
    "var(--c-event-green)",
    "var(--c-event-orange)",
    "var(--c-event-pink)",
    "var(--c-ink-dim)",
    "var(--c-ink-dim)",
  ];
  const bars: MinimapBar[] = [];
  for (let i = 0; i < count; i++) {
    const h = 18 + Math.round(Math.sin(i * 0.23) * 10 + ((i * 7) % 14));
    bars.push({
      height: h,
      color: colors[i % colors.length]!,
      opacity: i > 100 && i < 230 ? 1 : 0.35,
    });
  }
  return bars;
}
