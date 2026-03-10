#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from tau2_common import (
    REPORTS_DIR,
    extract_json_payload,
    load_json,
    utc_now_iso,
    write_json,
    write_text,
)


def load_loose_json(path: Path) -> Any:
    raw = path.read_text(encoding="utf-8")
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return extract_json_payload(raw)


def load_tau2_runs(summary_path: Path) -> list[dict[str, Any]]:
    payload = load_json(summary_path)
    if isinstance(payload, dict) and "runs" in payload:
        return payload["runs"]
    raise ValueError(f"Tau² summary at {summary_path} did not contain a runs array")


def load_chronicle_payload(path: Path) -> dict[str, Any]:
    payload = load_loose_json(path)
    if isinstance(payload, list):
        return {"comparisons": payload}
    if isinstance(payload, dict):
        return payload
    raise ValueError(f"Chronicle benchmark payload at {path} was not a JSON object")


def render_chronicle_section(payload: dict[str, Any]) -> list[str]:
    lines = [
        "## Chronicle MCP Eval",
        "",
        "Chronicle MCP results remain a product-specific benchmark family. The metrics below stay separate from Tau² domain scores.",
        "",
    ]

    mcp_results = payload.get("mcpResults") or payload.get("results") or []
    if mcp_results:
        lines.extend(
            [
                "| Scenario | Transport | Passed | Grounded | Tool calls | Input tokens | Latency (ms) |",
                "| --- | --- | --- | --- | --- | --- | --- |",
            ]
        )
        for result in mcp_results:
            lines.append(
                f"| `{result.get('scenarioId', 'unknown')}` | `{result.get('transport', 'unknown')}` | "
                f"{bool(result.get('passed'))} | {bool(result.get('grounded'))} | "
                f"{len(result.get('toolCalls', []))} | {result.get('inputTokens', 'n/a')} | "
                f"{result.get('latencyMs', 'n/a')} |"
            )
        lines.append("")

    comparisons = payload.get("comparisons") or []
    if comparisons:
        lines.extend(
            [
                "### Chronicle Vs Baseline",
                "",
                "| Scenario | Transport | MCP passed | Baseline passed | MCP grounded | Baseline grounded | Verdict |",
                "| --- | --- | --- | --- | --- | --- | --- |",
            ]
        )
        for comparison in comparisons:
            lines.append(
                f"| `{comparison.get('scenarioId', 'unknown')}` | `{comparison.get('transport', 'unknown')}` | "
                f"{bool(comparison.get('mcpPassed'))} | {bool(comparison.get('baselinePassed'))} | "
                f"{bool(comparison.get('mcpGrounded'))} | {bool(comparison.get('baselineGrounded'))} | "
                f"{comparison.get('verdict', 'n/a')} |"
            )
        lines.append("")

    baseline_results = payload.get("baselineResults") or []
    if baseline_results:
        lines.extend(
            [
                "### Baseline Details",
                "",
                "| Scenario | Baseline | Passed | Grounded | Input tokens | Latency (ms) |",
                "| --- | --- | --- | --- | --- | --- |",
            ]
        )
        for result in baseline_results:
            lines.append(
                f"| `{result.get('scenarioId', 'unknown')}` | `{result.get('baseline', 'unknown')}` | "
                f"{bool(result.get('passed'))} | {bool(result.get('grounded'))} | "
                f"{result.get('inputTokens', 'n/a')} | {result.get('latencyMs', 'n/a')} |"
            )
        lines.append("")

    if not mcp_results and not comparisons and not baseline_results:
        lines.append("No Chronicle MCP benchmark results were provided.\n")

    return lines


def render_tau2_section(tau2_runs: list[dict[str, Any]]) -> list[str]:
    lines = [
        "## Official Tau²",
        "",
        "Tau² is an external, domain-level benchmark family. These scores should be read next to Chronicle MCP metrics, not as direct substitutes for them.",
        "",
        "| Domain | Tasks | Simulations | Trials | pass^1 | Best pass^k | Avg reward | Avg duration (s) |",
        "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ]

    for run in tau2_runs:
        pass_rates = run.get("passRates", {})
        best_pass = max(pass_rates.values(), default=0.0)
        lines.append(
            f"| `{run.get('domain', 'unknown')}` | {run.get('taskCount', 0)} | "
            f"{run.get('simulationCount', 0)} | {run.get('trialCountObserved', 0)} | "
            f"{pass_rates.get('pass^1', 0.0):.3f} | {best_pass:.3f} | "
            f"{run.get('averageReward', 0.0):.3f} | {run.get('averageDurationSeconds', 0.0):.2f} |"
        )

    lines.extend(
        [
            "",
            "### Tau² Sources",
            "",
            "| Domain | Agent model | User model | Source file |",
            "| --- | --- | --- | --- |",
        ]
    )

    for run in tau2_runs:
        lines.append(
            f"| `{run.get('domain', 'unknown')}` | `{run.get('agentModel') or 'unknown'}` | "
            f"`{run.get('userModel') or 'unknown'}` | `{run.get('sourceFile', 'n/a')}` |"
        )

    lines.append("")
    return lines


def render_ingestion_section(manifests: list[dict[str, Any]]) -> list[str]:
    lines = [
        "## Chronicle Ingested Tau²",
        "",
        "| Domain | Chronicle org | Chronicle run id | Events | Links | Simulations |",
        "| --- | --- | --- | --- | --- | --- |",
    ]

    for manifest in manifests:
        for run in manifest.get("runs", []):
            lines.append(
                f"| `{run.get('domain', 'unknown')}` | `{manifest.get('orgId', 'unknown')}` | "
                f"`{run.get('runId', 'unknown')}` | {run.get('eventCount', 0)} | "
                f"{run.get('linkCount', 0)} | {run.get('simulationCount', 0)} |"
            )

    lines.append("")
    return lines


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate a side-by-side markdown report for Chronicle MCP and Tau² benchmarks.",
    )
    parser.add_argument(
        "--tau2-summary",
        dest="tau2_summaries",
        action="append",
        required=True,
        help="Path to a Tau² normalized summary JSON file. Repeat for multiple domains.",
    )
    parser.add_argument(
        "--chronicle",
        required=True,
        help="Path to a Chronicle MCP benchmark JSON file or raw stdout capture containing JSON.",
    )
    parser.add_argument(
        "--ingestion-manifest",
        dest="ingestion_manifests",
        action="append",
        default=[],
        help="Optional Tau² Chronicle ingestion manifest JSON. Repeat for multiple files.",
    )
    parser.add_argument(
        "--output",
        help="Optional markdown output path. Defaults to benchmarks/tau2/reports/side-by-side.md",
    )
    parser.add_argument(
        "--json-output",
        help="Optional JSON output path for the normalized report payload.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    tau2_runs: list[dict[str, Any]] = []
    for summary in args.tau2_summaries:
        tau2_runs.extend(load_tau2_runs(Path(summary).resolve()))

    chronicle_payload = load_chronicle_payload(Path(args.chronicle).resolve())
    ingestion_manifests = [
        load_json(Path(path).resolve()) for path in args.ingestion_manifests
    ]

    markdown_lines = [
        "# Chronicle And Tau² Benchmarks",
        "",
        f"_Generated at {utc_now_iso()}_",
        "",
        "These benchmark families answer different questions. Chronicle MCP evals measure product-specific reasoning and grounding over Chronicle data. Tau² measures broader tool-agent performance in external simulated domains.",
        "",
    ]
    markdown_lines.extend(render_chronicle_section(chronicle_payload))
    markdown_lines.extend(render_tau2_section(tau2_runs))
    if ingestion_manifests:
        markdown_lines.extend(render_ingestion_section(ingestion_manifests))

    output_path = (
        Path(args.output).resolve()
        if args.output
        else REPORTS_DIR / "side-by-side.md"
    )
    json_output_path = (
        Path(args.json_output).resolve()
        if args.json_output
        else REPORTS_DIR / "side-by-side.json"
    )

    report_payload = {
        "generatedAt": utc_now_iso(),
        "chronicle": chronicle_payload,
        "tau2Runs": tau2_runs,
        "ingestionManifests": ingestion_manifests,
    }

    write_text(output_path, "\n".join(markdown_lines).rstrip() + "\n")
    write_json(json_output_path, report_payload)

    print(f"Wrote side-by-side markdown report to {output_path}")
    print(f"Wrote side-by-side JSON report to {json_output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
