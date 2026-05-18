/*
 * EnrichmentProposals — gap-filling scenario picker for the COVERAGE
 * step.
 *
 * Replaces the four-bucket layout in the old `StepEnrich`. Proposals
 * are grouped by the cluster they target (`clusterLabel` on the
 * scenario), with a final "New cluster" group for proposals that
 * surface patterns not yet represented in the dataset.
 *
 * Each row is toggleable into `recipe.data.scenarios`. When the user
 * accepts the first proposal, the recipe transparently switches from
 * `kind: "dataset"` to `kind: "composed"` so the launch dock counts
 * the additional cases.
 */

"use client";

import * as React from "react";
import { Check, Plus, Sparkles } from "lucide-react";

import { cx } from "../../utils/cx";
import { Eyebrow } from "../../primitives/eyebrow";
import { Mono } from "../../typography/mono";
import { bucketMeta } from "../data";
import type {
  BacktestDataScenario,
  BacktestRecipe,
} from "../types";
import type { DatasetCluster } from "../../datasets/types";

const NEW_CLUSTER_KEY = "__new__";
const NEW_CLUSTER_LABEL = "New cluster";

export interface EnrichmentProposalsProps {
  recipe: BacktestRecipe;
  onChange: (patch: Partial<BacktestRecipe>) => void;
  /** Discovery proposals; usually `BACKTEST_DISCOVERY_PROPOSALS` or a
   *  host-supplied list scoped to the selected dataset. */
  proposals: readonly BacktestDataScenario[];
  /** Clusters from the selected dataset's snapshot — drives the
   *  group order and lets us label each section with the cluster's
   *  color swatch. */
  clusters: readonly DatasetCluster[];
  className?: string;
}

export function EnrichmentProposals({
  recipe,
  onChange,
  proposals,
  clusters,
  className,
}: EnrichmentProposalsProps) {
  const merged = React.useMemo(() => {
    const map = new Map<string, BacktestDataScenario>();
    for (const p of proposals) map.set(p.id, p);
    for (const s of recipe.data.scenarios) {
      if (s.bucket) map.set(s.id, s);
    }
    return Array.from(map.values());
  }, [proposals, recipe.data.scenarios]);

  const acceptedIds = React.useMemo(() => {
    return new Set(
      recipe.data.scenarios
        .filter((s) => s.accepted !== false)
        .map((s) => s.id),
    );
  }, [recipe.data.scenarios]);

  const groups = React.useMemo(
    () => groupByCluster(merged, clusters),
    [merged, clusters],
  );

  const setScenarios = React.useCallback(
    (scenarios: readonly BacktestDataScenario[]) => {
      onChange({
        data: {
          ...recipe.data,
          kind: scenarios.length === 0 ? recipe.data.kind : "composed",
          scenarios,
        },
      });
    },
    [onChange, recipe.data],
  );

  const toggle = React.useCallback(
    (scenario: BacktestDataScenario, accepted: boolean) => {
      const existing = recipe.data.scenarios.find(
        (s) => s.id === scenario.id,
      );
      let next: BacktestDataScenario[];
      if (existing) {
        next = recipe.data.scenarios.map((s) =>
          s.id === scenario.id ? { ...s, accepted } : s,
        );
      } else {
        next = [...recipe.data.scenarios, { ...scenario, accepted }];
      }
      setScenarios(next);
    },
    [recipe.data.scenarios, setScenarios],
  );

  const acceptGroup = React.useCallback(
    (groupProposals: readonly BacktestDataScenario[]) => {
      const groupIds = new Set(groupProposals.map((p) => p.id));
      const seenIds = new Set(recipe.data.scenarios.map((s) => s.id));
      const updated = recipe.data.scenarios.map((s) =>
        groupIds.has(s.id) ? { ...s, accepted: true } : s,
      );
      const fresh = groupProposals
        .filter((p) => !seenIds.has(p.id))
        .map<BacktestDataScenario>((p) => ({ ...p, accepted: true }));
      setScenarios([...updated, ...fresh]);
    },
    [recipe.data.scenarios, setScenarios],
  );

  if (groups.length === 0) {
    return (
      <div
        className={cx(
          "flex items-center justify-center rounded-[2px] border border-dashed border-l-border-faint bg-l-wash-1 px-3 py-6 text-center",
          className,
        )}
      >
        <Mono size="sm" tone="dim">
          no enrichment proposals · coverage looks complete
        </Mono>
      </div>
    );
  }

  return (
    <div className={cx("flex flex-col gap-2", className)}>
      {groups.map((group) => (
        <ClusterGroup
          key={group.key}
          group={group}
          acceptedIds={acceptedIds}
          onToggle={toggle}
          onAcceptGroup={() => acceptGroup(group.proposals)}
        />
      ))}
    </div>
  );
}

/* ── Group ─────────────────────────────────────────────────── */

interface ProposalGroup {
  key: string;
  label: string;
  color: string | null;
  isNew: boolean;
  proposals: readonly BacktestDataScenario[];
}

function ClusterGroup({
  group,
  acceptedIds,
  onToggle,
  onAcceptGroup,
}: {
  group: ProposalGroup;
  acceptedIds: Set<string>;
  onToggle: (scenario: BacktestDataScenario, accepted: boolean) => void;
  onAcceptGroup: () => void;
}) {
  const acceptedCount = group.proposals.filter((p) =>
    acceptedIds.has(p.id),
  ).length;
  const allAccepted = acceptedCount === group.proposals.length;
  return (
    <section className="flex flex-col rounded-[2px] border border-l-border-faint bg-l-surface-raised">
      <header className="flex items-center gap-2 border-b border-l-border-faint px-2.5 py-1.5">
        {group.isNew ? (
          <span
            aria-hidden
            className="grid size-4 shrink-0 place-items-center rounded-full border border-dashed border-l-border-strong text-l-ink-dim"
          >
            <Sparkles className="size-2.5" strokeWidth={1.6} />
          </span>
        ) : (
          <span
            aria-hidden
            className="size-2 shrink-0 rounded-full"
            style={{ background: group.color ?? "var(--c-ink-dim)" }}
          />
        )}
        <div className="min-w-0 flex-1">
          <Eyebrow className="text-l-ink-dim">
            {group.isNew ? "FILL · NEW CLUSTER" : "FILL · CLUSTER"}
          </Eyebrow>
          <div className="flex items-baseline gap-2">
            <span className="truncate font-sans text-[12.5px] font-medium text-l-ink-hi">
              {group.label}
            </span>
            <Mono size="sm" tone="dim" className="tabular-nums">
              {acceptedCount} of {group.proposals.length} accepted
            </Mono>
          </div>
        </div>
        {!allAccepted ? (
          <button
            type="button"
            onClick={onAcceptGroup}
            className="rounded-[2px] border border-l-border-faint px-1.5 py-0.5 font-mono text-mono-sm uppercase tracking-tactical text-l-ink-lo transition-colors hover:border-l-border-strong hover:text-l-ink-hi"
          >
            accept all
          </button>
        ) : null}
      </header>
      <ul className="flex flex-col">
        {group.proposals.map((proposal, idx) => (
          <li
            key={proposal.id}
            className={cx(idx > 0 && "border-t border-l-border-faint")}
          >
            <ProposalRow
              scenario={proposal}
              accepted={acceptedIds.has(proposal.id)}
              onToggle={(accepted) => onToggle(proposal, accepted)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ProposalRow({
  scenario,
  accepted,
  onToggle,
}: {
  scenario: BacktestDataScenario;
  accepted: boolean;
  onToggle: (accepted: boolean) => void;
}) {
  const meta = scenario.bucket ? bucketMeta(scenario.bucket) : null;
  return (
    <button
      type="button"
      onClick={() => onToggle(!accepted)}
      aria-pressed={accepted}
      className={cx(
        "group flex w-full items-center gap-2 px-2.5 py-1.5 text-left transition-colors",
        accepted ? "bg-ember/[0.05]" : "hover:bg-l-wash-3",
      )}
    >
      <span
        aria-hidden
        className={cx(
          "grid size-3.5 shrink-0 place-items-center rounded-[2px] border",
          accepted
            ? "border-ember bg-ember text-[var(--c-surface-00)]"
            : "border-l-border-faint text-transparent",
        )}
      >
        {accepted ? (
          <Check className="size-2.5" strokeWidth={2.4} />
        ) : (
          <Plus className="size-2.5 text-l-ink-dim" strokeWidth={2} />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-mono text-mono-sm text-l-ink-hi">
          {scenario.label}
        </div>
        <Mono size="sm" tone="dim" className="truncate">
          {meta ? <>{meta.label.toLowerCase()} · </> : null}
          {scenario.kind} · {scenario.count} case
          {scenario.count === 1 ? "" : "s"}
          {typeof scenario.confidence === "number" ? (
            <> · {(scenario.confidence * 100).toFixed(0)}% conf</>
          ) : null}
        </Mono>
      </div>
    </button>
  );
}

/* ── Grouping ──────────────────────────────────────────────── */

function groupByCluster(
  proposals: readonly BacktestDataScenario[],
  clusters: readonly DatasetCluster[],
): readonly ProposalGroup[] {
  if (proposals.length === 0) return [];
  const clustersByLabel = new Map<string, DatasetCluster>();
  const clustersById = new Map<string, DatasetCluster>();
  for (const c of clusters) {
    clustersByLabel.set(c.label, c);
    clustersById.set(c.id, c);
  }

  const buckets = new Map<string, BacktestDataScenario[]>();
  const labelByKey = new Map<string, string>();
  const colorByKey = new Map<string, string | null>();
  const orderedKeys: string[] = [];

  const ensure = (
    key: string,
    label: string,
    color: string | null,
  ): BacktestDataScenario[] => {
    let list = buckets.get(key);
    if (!list) {
      list = [];
      buckets.set(key, list);
      labelByKey.set(key, label);
      colorByKey.set(key, color);
      orderedKeys.push(key);
    }
    return list;
  };

  for (const cluster of clusters) {
    if (proposals.some((p) => matchesCluster(p, cluster))) {
      ensure(cluster.id, cluster.label, cluster.color);
    }
  }

  for (const proposal of proposals) {
    const cluster =
      (proposal.clusterId && clustersById.get(proposal.clusterId)) ||
      (proposal.clusterLabel && clustersByLabel.get(proposal.clusterLabel)) ||
      null;
    if (cluster) {
      ensure(cluster.id, cluster.label, cluster.color).push(proposal);
    } else {
      const fallbackLabel = proposal.clusterLabel ?? NEW_CLUSTER_LABEL;
      const fallbackKey = proposal.clusterLabel
        ? `${NEW_CLUSTER_KEY}:${proposal.clusterLabel}`
        : NEW_CLUSTER_KEY;
      ensure(fallbackKey, fallbackLabel, null).push(proposal);
    }
  }

  return orderedKeys
    .filter((key) => (buckets.get(key)?.length ?? 0) > 0)
    .map<ProposalGroup>((key) => ({
      key,
      label: labelByKey.get(key) ?? NEW_CLUSTER_LABEL,
      color: colorByKey.get(key) ?? null,
      isNew: key.startsWith(NEW_CLUSTER_KEY),
      proposals: buckets.get(key) ?? [],
    }));
}

function matchesCluster(
  proposal: BacktestDataScenario,
  cluster: DatasetCluster,
): boolean {
  if (proposal.clusterId && proposal.clusterId === cluster.id) return true;
  if (proposal.clusterLabel && proposal.clusterLabel === cluster.label)
    return true;
  return false;
}
