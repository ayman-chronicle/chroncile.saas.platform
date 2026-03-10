from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT_DIR = Path(__file__).resolve().parents[2]
BENCHMARK_DIR = ROOT_DIR / "benchmarks" / "tau2"
UPSTREAM_METADATA_PATH = BENCHMARK_DIR / "upstream.json"
VENV_DIR = BENCHMARK_DIR / ".venv"
VENDOR_DIR = BENCHMARK_DIR / "vendor"
CHECKOUT_DIR = VENDOR_DIR / "tau2-bench"
OUTPUT_DIR = BENCHMARK_DIR / "output"
RAW_OUTPUT_DIR = OUTPUT_DIR / "raw"
SUMMARY_OUTPUT_DIR = OUTPUT_DIR / "summaries"
INGEST_OUTPUT_DIR = OUTPUT_DIR / "ingestion"
REPORTS_DIR = BENCHMARK_DIR / "reports"


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def utc_now_slug() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def ensure_dir(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def ensure_parent(path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def write_json(path: Path, payload: Any) -> Path:
    ensure_parent(path)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2, sort_keys=False)
        handle.write("\n")
    return path


def write_text(path: Path, content: str) -> Path:
    ensure_parent(path)
    path.write_text(content, encoding="utf-8")
    return path


def load_upstream_metadata() -> dict[str, str]:
    return load_json(UPSTREAM_METADATA_PATH)


def default_tau2_results_path(domain: str) -> Path:
    return RAW_OUTPUT_DIR / f"{slugify(domain)}-{utc_now_slug()}.json"


def default_tau2_summary_path(results_path: Path) -> Path:
    return SUMMARY_OUTPUT_DIR / f"{results_path.stem}.summary.json"


def default_tau2_markdown_path(results_path: Path) -> Path:
    return REPORTS_DIR / f"{results_path.stem}.summary.md"


def slugify(value: str) -> str:
    lowered = value.strip().lower()
    collapsed = re.sub(r"[^a-z0-9]+", "-", lowered)
    return collapsed.strip("-") or "tau2"


def tau2_domain(results: dict[str, Any]) -> str:
    return (
        results.get("info", {})
        .get("environment_info", {})
        .get("domain_name", "unknown")
    )


def tau2_agent_model(results: dict[str, Any]) -> str | None:
    return results.get("info", {}).get("agent_info", {}).get("llm")


def tau2_user_model(results: dict[str, Any]) -> str | None:
    return results.get("info", {}).get("user_info", {}).get("llm")


def tau2_reward(simulation: dict[str, Any]) -> float:
    reward_info = simulation.get("reward_info") or {}
    reward = reward_info.get("reward")
    if reward is None:
        return 0.0
    try:
        return float(reward)
    except (TypeError, ValueError):
        return 0.0


def tau2_success(simulation: dict[str, Any]) -> bool:
    return tau2_reward(simulation) >= 0.999_999


def group_simulations_by_task(results: dict[str, Any]) -> dict[str, list[dict[str, Any]]]:
    grouped: dict[str, list[dict[str, Any]]] = {}
    for simulation in results.get("simulations", []):
        grouped.setdefault(simulation["task_id"], []).append(simulation)
    for simulations in grouped.values():
        simulations.sort(key=lambda item: item.get("trial", 0))
    return grouped


def compute_pass_rates(results: dict[str, Any]) -> dict[str, float]:
    grouped = group_simulations_by_task(results)
    if not grouped:
        return {}

    max_trials = max(len(simulations) for simulations in grouped.values())
    pass_rates: dict[str, float] = {}
    task_count = len(grouped)

    for k in range(1, max_trials + 1):
        solved = 0
        for simulations in grouped.values():
            if any(tau2_success(simulation) for simulation in simulations[:k]):
                solved += 1
        pass_rates[f"pass^{k}"] = solved / task_count

    return pass_rates


def summarize_task(task: dict[str, Any], simulations: list[dict[str, Any]]) -> dict[str, Any]:
    rewards = [tau2_reward(simulation) for simulation in simulations]
    return {
        "taskId": task.get("id"),
        "trialCount": len(simulations),
        "successCount": sum(1 for simulation in simulations if tau2_success(simulation)),
        "bestReward": max(rewards) if rewards else 0.0,
        "averageReward": (sum(rewards) / len(rewards)) if rewards else 0.0,
        "terminationReasons": sorted(
            {
                simulation.get("termination_reason", "unknown")
                for simulation in simulations
            }
        ),
    }


def extract_json_payload(text: str) -> Any:
    decoder = json.JSONDecoder()
    for index, character in enumerate(text):
        if character not in "[{":
            continue
        try:
            payload, end_index = decoder.raw_decode(text[index:])
        except json.JSONDecodeError:
            continue
        remainder = text[index + end_index :].strip()
        if remainder:
            trailing = remainder.lstrip()
            if trailing and trailing[0] not in "\n":
                continue
        return payload
    raise ValueError("Could not locate a JSON object or array in the provided text")
