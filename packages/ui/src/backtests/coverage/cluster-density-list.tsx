/*
 * ClusterDensityList — cluster overview grid for the COVERAGE step.
 *
 * Renders one row per cluster in the selected dataset:
 *   color swatch · label · density bar · count + share · sample
 *   trace chips · include/exclude toggle.
 *
 * "Density" is the share of the dataset's traces that belong to the
 * cluster (`cluster.traceIds.length / total`). The fill uses the
 * cluster's own `color` token (e.g. `var(--c-event-teal)`) so the
 * grid reads as a tactical cluster legend, not a chart.
 */

"use client";

import * as React from "react";
import { Check, Plus } from "lucide-react";

import { cx } from "../../utils/cx";
import { Mono } from "../../typography/mono";
import type {
  DatasetCluster,
  TraceSummary,
} from "../../datasets/types";

export interface ClusterDensityListProps {
  clusters: readonly DatasetCluster[];
  traces: readonly TraceSummary[];
  selectedClusterIds: readonly string[];
  onToggle: (clusterId: string, selected: boolean) => void;
  /** Cap on sample trace chips per row. Defaults to 3. */
  sampleSize?: number;
  className?: string;
}

export function ClusterDensityList({
  clusters,
  traces,
  selectedClusterIds,
  onToggle,
  sampleSize = 3,
  className,
}: ClusterDensityListProps) {
  const tracesById = React.useMemo(() => {
    const map = new Map<string, TraceSummary>();
    for (const t of traces) map.set(t.traceId, t);
    return map;
  }, [traces]);

  const total = React.useMemo(
    () => clusters.reduce((acc, c) => acc + c.traceIds.length, 0),
    [clusters],
  );

  const selected = React.useMemo(
    () => new Set(selectedClusterIds),
    [selectedClusterIds],
  );

  if (clusters.length === 0) {
    return (
      <div
        className={cx(
          "flex items-center justify-center rounded-[2px] border border-dashed border-l-border-faint bg-l-wash-1 px-3 py-6 text-center",
          className,
        )}
      >
        <Mono size="sm" tone="dim">
          no clusters available · pick a dataset to see coverage
        </Mono>
      </div>
    );
  }

  return (
    <ul
      className={cx(
        "flex flex-col rounded-[2px] border border-l-border-faint bg-l-surface-raised",
        className,
      )}
    >
      {clusters.map((cluster, idx) => {
        const samples: TraceSummary[] = [];
        for (const id of cluster.traceIds) {
          const t = tracesById.get(id);
          if (t) samples.push(t);
          if (samples.length >= sampleSize) break;
        }
        const share = total > 0 ? cluster.traceIds.length / total : 0;
        return (
          <li
            key={cluster.id}
            className={cx(idx > 0 && "border-t border-l-border-faint")}
          >
            <ClusterRow
              cluster={cluster}
              count={cluster.traceIds.length}
              share={share}
              samples={samples}
              included={selected.has(cluster.id)}
              onToggle={(next) => onToggle(cluster.id, next)}
            />
          </li>
        );
      })}
    </ul>
  );
}

/* ── Row ───────────────────────────────────────────────────── */

function ClusterRow({
  cluster,
  count,
  share,
  samples,
  included,
  onToggle,
}: {
  cluster: DatasetCluster;
  count: number;
  share: number;
  samples: readonly TraceSummary[];
  included: boolean;
  onToggle: (next: boolean) => void;
}) {
  const sharePct = (share * 100).toFixed(0);
  return (
    <button
      type="button"
      onClick={() => onToggle(!included)}
      aria-pressed={included}
      className={cx(
        "group flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors",
        included ? "bg-ember/[0.05]" : "hover:bg-l-wash-3",
      )}
    >
      <ToggleGlyph included={included} />
      <span
        aria-hidden
        className="mt-1 size-2 shrink-0 rounded-full"
        style={{ background: cluster.color }}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate font-sans text-[13px] font-medium text-l-ink-hi">
            {cluster.label}
          </span>
          <Mono size="sm" tone="dim" className="tabular-nums">
            {count.toLocaleString()} traces · {sharePct}%
          </Mono>
        </div>
        <DensityBar share={share} color={cluster.color} />
        {cluster.description ? (
          <Mono size="sm" tone="dim" className="line-clamp-1">
            {cluster.description}
          </Mono>
        ) : null}
        {samples.length > 0 ? (
          <div className="mt-0.5 flex flex-wrap items-center gap-1">
            {samples.map((t) => (
              <SampleChip key={t.traceId} trace={t} />
            ))}
            {count > samples.length ? (
              <Mono size="sm" tone="dim" className="tabular-nums">
                +{(count - samples.length).toLocaleString()} more
              </Mono>
            ) : null}
          </div>
        ) : null}
      </div>
    </button>
  );
}

function ToggleGlyph({ included }: { included: boolean }) {
  return (
    <span
      aria-hidden
      className={cx(
        "mt-0.5 grid size-3.5 shrink-0 place-items-center rounded-[2px] border",
        included
          ? "border-ember bg-ember text-[var(--c-surface-00)]"
          : "border-l-border-faint text-transparent",
      )}
    >
      {included ? (
        <Check className="size-2.5" strokeWidth={2.4} />
      ) : (
        <Plus className="size-2.5 text-l-ink-dim" strokeWidth={2} />
      )}
    </span>
  );
}

function DensityBar({ share, color }: { share: number; color: string }) {
  const pct = Math.max(2, Math.min(100, share * 100));
  return (
    <div
      aria-hidden
      className="relative h-1 w-full overflow-hidden rounded-full bg-l-wash-3"
    >
      <span
        className="absolute inset-y-0 left-0 block rounded-full"
        style={{
          width: `${pct}%`,
          background: `color-mix(in oklab, ${color} 75%, transparent)`,
        }}
      />
    </div>
  );
}

function SampleChip({ trace }: { trace: TraceSummary }) {
  return (
    <span
      className={cx(
        "inline-flex max-w-[14rem] items-center gap-1 rounded-[2px] border border-l-border-faint bg-l-wash-1 px-1.5 py-0.5",
        "font-mono text-[10.5px] tabular-nums leading-none text-l-ink-lo",
      )}
      title={trace.label}
    >
      <span className="truncate">{trace.label}</span>
    </span>
  );
}
