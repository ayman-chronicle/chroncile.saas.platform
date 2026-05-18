/*
 * SavedDatasetPicker — STEP 01 dataset selector.
 *
 * Renders the saved datasets the host provides via `availableDatasets`
 * (canonical `Dataset` shape from the chronicle types) as Linear-density
 * rows. When the host omits the prop we fall back to `BACKTEST_DATASETS`
 * — the deterministic backtests seed whose ids match the snapshot map
 * (`BACKTEST_DATASET_SNAPSHOTS`) so the cluster + enrichment columns in
 * `StepCoverage` light up out of the box.
 *
 * Picking a row writes `recipe.data` end-to-end the same way
 * `BacktestDataBuilder.pickDataset` does, so downstream summary strips
 * and step-environment dataset hints stay coherent.
 */

import * as React from "react";
import { Check, Database } from "lucide-react";

import { cx } from "../../utils/cx";
import { Eyebrow } from "../../primitives/eyebrow";
import { Mono } from "../../typography/mono";
import { BACKTEST_DATASETS } from "../data";
import type {
  BacktestData,
  BacktestDataSource,
  BacktestRecipe,
} from "../types";
import type { Dataset } from "../../stream-timeline/types";

export interface SavedDatasetPickerProps {
  recipe: BacktestRecipe;
  onChange: (patch: Partial<BacktestRecipe>) => void;
  /** Real datasets provided by the host. When empty/omitted we fall
   *  back to `BACKTEST_DATASETS` so the picker always has rows. */
  availableDatasets?: readonly Dataset[];
  className?: string;
}

/** Flattened row model — picker doesn't care which seed produced it. */
interface PickerRow {
  id: string;
  label: string;
  cases: number;
  source: string;
  updated: string;
}

export function SavedDatasetPicker({
  recipe,
  onChange,
  availableDatasets,
  className,
}: SavedDatasetPickerProps) {
  const rows = React.useMemo<readonly PickerRow[]>(() => {
    if (availableDatasets && availableDatasets.length > 0) {
      return availableDatasets.map(datasetToRow);
    }
    return BACKTEST_DATASETS.map((d) => ({
      id: d.id,
      label: d.label,
      cases: d.cases,
      source: d.source,
      updated: d.updated,
    }));
  }, [availableDatasets]);

  const activeId = recipe.data.dataset ?? null;

  const pick = React.useCallback(
    (row: PickerRow) => {
      const nextSource: BacktestDataSource = {
        id: "s1",
        kind: "dataset",
        label: row.label,
        count: row.cases,
      };
      const next: BacktestData = {
        ...recipe.data,
        kind: "dataset",
        dataset: row.id,
        datasetLabel: row.label,
        sources: [nextSource],
        scenarios: [],
        savedAs: row.label,
      };
      onChange({ data: next });
    },
    [onChange, recipe.data],
  );

  if (rows.length === 0) {
    return (
      <div
        className={cx(
          "rounded-[2px] border border-dashed border-l-border-faint bg-l-wash-1 px-3 py-6 text-center",
          className,
        )}
      >
        <Mono size="sm" tone="dim">
          no saved datasets yet
        </Mono>
      </div>
    );
  }

  return (
    <div
      className={cx(
        "flex flex-col rounded-[2px] border border-l-border-faint bg-l-surface",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-l-border-faint px-3 py-1.5">
        <Eyebrow className="text-l-ink-dim">YOUR SAVED DATASETS</Eyebrow>
        <Mono size="sm" tone="dim">
          {rows.length} available
        </Mono>
      </div>
      <ul className="flex flex-col">
        {rows.map((row, idx) => (
          <li
            key={row.id}
            className={cx(idx > 0 && "border-t border-l-border-faint")}
          >
            <DatasetRow
              row={row}
              active={row.id === activeId}
              onClick={() => pick(row)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Row ──────────────────────────────────────────────────────── */

function DatasetRow({
  row,
  active,
  onClick,
}: {
  row: PickerRow;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        "group flex w-full items-center gap-3 px-3 py-2 text-left transition-colors",
        active ? "bg-ember/[0.06]" : "hover:bg-l-wash-3",
      )}
    >
      <Database
        className={cx(
          "size-3.5 shrink-0",
          active ? "text-ember" : "text-l-ink-dim",
        )}
        strokeWidth={1.6}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate font-sans text-[13px] text-l-ink-hi">
            {row.label}
          </span>
          <Mono
            size="sm"
            tone="dim"
            className="shrink-0 tabular-nums"
          >
            · {row.cases.toLocaleString()} cases
          </Mono>
        </div>
        <Mono size="sm" tone="dim" className="truncate">
          {row.source} · updated {row.updated}
        </Mono>
      </div>
      {active ? (
        <Check className="size-3.5 shrink-0 text-ember" strokeWidth={1.8} />
      ) : null}
    </button>
  );
}

/* ── Projections ──────────────────────────────────────────────── */

/** Format an ISO timestamp as a coarse "x ago" label. Never pulls in a
 *  date library — the picker only needs day/hour resolution. */
function relativeFromIso(iso: string | undefined): string {
  if (!iso) return "—";
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "—";
  const diffMs = Date.now() - then;
  if (diffMs < 0) return "just now";
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function datasetToRow(dataset: Dataset): PickerRow {
  const purposeLabel = dataset.purpose ? dataset.purpose : "dataset";
  const ownerLabel = dataset.createdBy ? ` · ${dataset.createdBy}` : "";
  return {
    id: dataset.id,
    label: dataset.name,
    cases: dataset.traceCount,
    source: `${purposeLabel}${ownerLabel}`,
    updated: relativeFromIso(dataset.updatedAt),
  };
}
