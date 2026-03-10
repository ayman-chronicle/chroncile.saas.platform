#!/usr/bin/env python3
from __future__ import annotations

import argparse
from collections import Counter
from pathlib import Path
from typing import Any

from tau2_common import (
    compute_pass_rates,
    default_tau2_markdown_path,
    default_tau2_summary_path,
    group_simulations_by_task,
    load_json,
    summarize_task,
    tau2_agent_model,
    tau2_domain,
    tau2_reward,
    tau2_success,
    tau2_user_model,
    utc_now_iso,
    write_json,
    write_text,
)


def build_summary(results_path: Path) -> dict[str, Any]:
    results = load_json(results_path)
    grouped = group_simulations_by_task(results)
    tasks = {task["id"]: task for task in results.get("tasks", [])}
    simulations = results.get("simulations", [])
    rewards = [tau2_reward(simulation) for simulation in simulations]
    durations = [
        float(simulation.get("duration", 0.0))
        for simulation in simulations
        if simulation.get("duration") is not None
    ]
    termination_reasons = Counter(
        simulation.get("termination_reason", "unknown")
        for simulation in simulations
    )

    return {
        "generatedAt": utc_now_iso(),
        "sourceFile": str(results_path),
        "domain": tau2_domain(results),
        "taskCount": len(results.get("tasks", [])),
        "simulationCount": len(simulations),
        "trialCountConfigured": results.get("info", {}).get("num_trials"),
        "trialCountObserved": max(
            (len(task_simulations) for task_simulations in grouped.values()),
            default=0,
        ),
        "agentModel": tau2_agent_model(results),
        "userModel": tau2_user_model(results),
        "passRates": compute_pass_rates(results),
        "successCount": sum(1 for simulation in simulations if tau2_success(simulation)),
        "averageReward": (sum(rewards) / len(rewards)) if rewards else 0.0,
        "averageDurationSeconds": (sum(durations) / len(durations)) if durations else 0.0,
        "terminationReasons": dict(termination_reasons),
        "tasks": [
            summarize_task(tasks[task_id], task_simulations)
            for task_id, task_simulations in grouped.items()
            if task_id in tasks
        ],
    }


def render_markdown(summary: dict[str, Any]) -> str:
    lines = [
        f"# Tau² Summary: {summary['domain']}",
        "",
        "| Metric | Value |",
        "| --- | --- |",
        f"| Source file | `{summary['sourceFile']}` |",
        f"| Tasks | {summary['taskCount']} |",
        f"| Simulations | {summary['simulationCount']} |",
        f"| Configured trials | {summary['trialCountConfigured']} |",
        f"| Observed trials | {summary['trialCountObserved']} |",
        f"| Agent model | `{summary['agentModel'] or 'unknown'}` |",
        f"| User model | `{summary['userModel'] or 'unknown'}` |",
        f"| Success count | {summary['successCount']} |",
        f"| Average reward | {summary['averageReward']:.3f} |",
        f"| Average duration (s) | {summary['averageDurationSeconds']:.2f} |",
        "",
        "## Pass Rates",
        "",
        "| Metric | Value |",
        "| --- | --- |",
    ]

    if summary["passRates"]:
        for metric, value in summary["passRates"].items():
            lines.append(f"| {metric} | {value:.3f} |")
    else:
        lines.append("| pass^1 | n/a |")

    lines.extend(
        [
            "",
            "## Termination Reasons",
            "",
            "| Reason | Count |",
            "| --- | --- |",
        ]
    )

    if summary["terminationReasons"]:
        for reason, count in summary["terminationReasons"].items():
            lines.append(f"| `{reason}` | {count} |")
    else:
        lines.append("| `unknown` | 0 |")

    lines.extend(
        [
            "",
            "## Task Breakdown",
            "",
            "| Task ID | Trials | Successes | Best reward | Avg reward | Terminations |",
            "| --- | --- | --- | --- | --- | --- |",
        ]
    )

    for task in summary["tasks"]:
        terminations = ", ".join(f"`{item}`" for item in task["terminationReasons"])
        lines.append(
            f"| `{task['taskId']}` | {task['trialCount']} | {task['successCount']} | "
            f"{task['bestReward']:.3f} | {task['averageReward']:.3f} | {terminations or '`-`'} |"
        )

    return "\n".join(lines) + "\n"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Summarize official Tau² result files into normalized JSON and markdown.",
    )
    parser.add_argument(
        "--input",
        dest="inputs",
        action="append",
        required=True,
        help="Path to a Tau² results JSON file. Repeat for multiple files.",
    )
    parser.add_argument(
        "--output",
        help="Optional path for the combined summary JSON file.",
    )
    parser.add_argument(
        "--markdown",
        help="Optional path for the combined markdown summary.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    input_paths = [Path(path).resolve() for path in args.inputs]
    summaries = [build_summary(path) for path in input_paths]
    payload: dict[str, Any] = {
        "generatedAt": utc_now_iso(),
        "runs": summaries,
    }

    if args.output:
        output_path = Path(args.output).resolve()
    elif len(input_paths) == 1:
        output_path = default_tau2_summary_path(input_paths[0]).resolve()
    else:
        output_path = default_tau2_summary_path(input_paths[0]).with_name(
            f"{input_paths[0].stem}-multi.summary.json"
        )

    if args.markdown:
        markdown_path = Path(args.markdown).resolve()
    elif len(input_paths) == 1:
        markdown_path = default_tau2_markdown_path(input_paths[0]).resolve()
    else:
        markdown_path = default_tau2_markdown_path(input_paths[0]).with_name(
            f"{input_paths[0].stem}-multi.summary.md"
        )

    write_json(output_path, payload)

    markdown_sections = []
    for summary in summaries:
        markdown_sections.append(render_markdown(summary))
    write_text(markdown_path, "\n".join(markdown_sections))

    print(f"Wrote Tau² summary JSON to {output_path}")
    print(f"Wrote Tau² summary markdown to {markdown_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
