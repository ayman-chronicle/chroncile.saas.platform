/*
 * SavedDatasetPicker — saved dataset chooser used as the first
 * affordance in STEP 01 · COVERAGE.
 *
 * Bridges the host's `Dataset` shape to the simpler picker entries
 * via `availableDatasets`. Falls back to the internal mock catalog
 * (`BACKTEST_DATASETS`) when none is provided. Selecting a dataset
 * collapses `recipe.data` to a `kind: "dataset"` shape and clears
 * any composed scenarios from the previous selection.
 */

"use client";

import * as React from "react";
import { Check, Database, Search } from "lucide-react";

import { cx } from "../../utils/cx";
import { Button } from "../../primitives/button";
import { Eyebrow } from "../../primitives/eyebrow";
import { Mono } from "../../typography/mono";
import { BACKTEST_DATASETS } from "../data";
import type {
  BacktestData,
  BacktestDataset,
  BacktestRecipe,
} from "../types";
import type { Dataset } from "../../stream-timeline/types";

export interface SavedDatasetPickerProps {
  recipe: BacktestRecipe;
  onChange: (patch: Partial<BacktestRecipe>) => void;
  /** Real datasets provided by the host app; when present they take
   *  precedence over the internal mock catalog. */
  availableDatasets?: readonly Dataset[];
  className?: string;
}

interface PickerEntry {
  id: string;
  label: string;
  cases: number;
  source: string;
  updated: string;
  /** Free-form purpose tag, e.g. "eval", "training". */
  purpose?: string;
}

export function SavedDatasetPicker({
  recipe,
  onChange,
  availableDatasets,
  className,
}: SavedDatasetPickerProps) {
  const [query, setQuery] = React.useState("");

  const entries = React.useMemo<readonly PickerEntry[]>(() => {
    if (availableDatasets && availableDatasets.length > 0) {
      return availableDatasets.map((d) => ({
        id: d.id,
        label: d.name,
        cases: d.traceCount,
        source: d.purpose ?? d.description ?? "dataset",
        updated: d.updatedAt
          ? new Date(d.updatedAt).toLocaleDateString()
          : "—",
        purpose: d.purpose,
      }));
    }
    return BACKTEST_DATASETS.map((d: BacktestDataset) => ({
      id: d.id,
      label: d.label,
      cases: d.cases,
      source: d.source,
      updated: d.updated,
    }));
  }, [availableDatasets]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.label.toLowerCase().includes(q) ||
        e.source.toLowerCase().includes(q),
    );
  }, [entries, query]);

  const activeId = recipe.data.dataset ?? null;
  const selected = entries.find((e) => e.id === activeId) ?? null;

  const pick = (entry: PickerEntry) => {
    const next: BacktestData = {
      kind: "dataset",
      dataset: entry.id,
      datasetLabel: entry.label,
      sources: [
        {
          id: `src_${entry.id}`,
          kind: "dataset",
          label: entry.label,
          count: entry.cases,
        },
      ],
      // Reset any previously accepted scenarios — the user is picking
      // a new dataset, so the old gap-fillers no longer apply.
      scenarios: [],
      savedAs: entry.label,
    };
    onChange({ data: next });
  };

  return (
    <div className={cx("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-2 rounded-[2px] border border-l-border-faint bg-l-wash-1 px-2 py-1.5">
        <Search className="size-3.5 text-l-ink-dim" strokeWidth={1.6} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="search datasets…"
          className="min-w-0 flex-1 bg-transparent font-sans text-[12.5px] text-l-ink-hi outline-none placeholder:text-l-ink-dim"
        />
        <Mono size="sm" tone="dim">
          {filtered.length} of {entries.length}
        </Mono>
      </div>

      <ul className="flex flex-col rounded-[2px] border border-l-border-faint bg-l-surface-raised">
        {filtered.map((entry, idx) => (
          <li
            key={entry.id}
            className={cx(idx > 0 && "border-t border-l-border-faint")}
          >
            <button
              type="button"
              onClick={() => pick(entry)}
              aria-pressed={entry.id === activeId}
              className={cx(
                "group flex w-full items-center gap-3 px-3 py-2 text-left transition-colors",
                entry.id === activeId
                  ? "bg-ember/[0.06]"
                  : "hover:bg-l-wash-3",
              )}
            >
              <Database
                className={cx(
                  "size-3.5 shrink-0",
                  entry.id === activeId ? "text-ember" : "text-l-ink-dim",
                )}
                strokeWidth={1.6}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="truncate font-sans text-[13px] text-l-ink-hi">
                    {entry.label}
                  </span>
                  {entry.purpose ? (
                    <Mono size="sm" tone="dim" className="uppercase tracking-tactical">
                      · {entry.purpose}
                    </Mono>
                  ) : null}
                </div>
                <Mono size="sm" tone="dim" className="truncate">
                  {entry.source} · updated {entry.updated}
                </Mono>
              </div>
              <Mono size="sm" tone="lo" className="tabular-nums">
                {entry.cases.toLocaleString()} cases
              </Mono>
              {entry.id === activeId ? (
                <Check className="size-3.5 shrink-0 text-ember" strokeWidth={1.8} />
              ) : null}
            </button>
          </li>
        ))}
        {filtered.length === 0 ? (
          <li className="px-3 py-6 text-center">
            <Mono size="sm" tone="dim">
              no datasets match · try clearing search
            </Mono>
          </li>
        ) : null}
      </ul>

      {selected ? (
        <div className="flex items-center justify-between gap-3 rounded-[2px] border border-l-border-faint bg-l-wash-1 px-3 py-2">
          <div className="flex flex-col gap-0.5">
            <Eyebrow className="text-ember">SELECTED</Eyebrow>
            <span className="font-sans text-[13px] text-l-ink-hi">
              {selected.label}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              onChange({
                data: {
                  ...recipe.data,
                  kind: "composed",
                  dataset: undefined,
                  datasetLabel: undefined,
                  sources: [],
                  scenarios: [],
                  savedAs: null,
                },
              })
            }
          >
            Clear
          </Button>
        </div>
      ) : null}
    </div>
  );
}
