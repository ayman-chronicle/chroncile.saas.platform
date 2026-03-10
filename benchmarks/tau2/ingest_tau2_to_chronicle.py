#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib import error, request

from tau2_common import (
    INGEST_OUTPUT_DIR,
    ensure_parent,
    load_json,
    slugify,
    tau2_domain,
    utc_now_iso,
    write_json,
)

SEQUENCE_LINK_TYPE = "tau2.sequence"
TOOL_RESPONSE_LINK_TYPE = "tau2.tool_response"
RUN_TASK_LINK_TYPE = "tau2.contains_task"
TASK_SIMULATION_LINK_TYPE = "tau2.has_simulation"


class ChronicleClient:
    def __init__(self, base_url: str, timeout_seconds: int = 60) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout_seconds = timeout_seconds

    def ingest_batch(self, events: list[dict[str, Any]]) -> list[str]:
        payload = self._post_json("/v1/events/batch", events)
        return payload["event_ids"]

    def create_link(self, payload: dict[str, Any]) -> dict[str, Any]:
        return self._post_json("/v1/event-links", payload)

    def _post_json(self, path: str, payload: Any) -> Any:
        body = json.dumps(payload).encode("utf-8")
        req = request.Request(
            f"{self.base_url}{path}",
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with request.urlopen(req, timeout=self.timeout_seconds) as response:
                return json.loads(response.read().decode("utf-8"))
        except error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(
                f"Chronicle API request failed with {exc.code} {exc.reason}: {detail}"
            ) from exc


def build_run_entity_id(results_path: Path, results: dict[str, Any]) -> str:
    fingerprint = hashlib.sha256(
        f"{results_path.resolve()}::{results.get('timestamp')}::{tau2_domain(results)}".encode(
            "utf-8"
        )
    ).hexdigest()[:16]
    return f"tau2-run-{fingerprint}"


def build_event_request(
    *,
    org_id: str,
    source: str,
    topic: str,
    event_type: str,
    entities: dict[str, str],
    payload: dict[str, Any],
    timestamp: str | None,
) -> dict[str, Any]:
    request_payload: dict[str, Any] = {
        "org_id": org_id,
        "source": source,
        "topic": topic,
        "event_type": event_type,
        "entities": entities,
        "payload": strip_none(payload),
    }
    if timestamp:
        request_payload["timestamp"] = normalize_timestamp(timestamp)
    return request_payload


def normalize_timestamp(timestamp: str) -> str:
    parsed = datetime.fromisoformat(timestamp)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    else:
        parsed = parsed.astimezone(timezone.utc)
    return parsed.isoformat()


def strip_none(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: strip_none(inner) for key, inner in value.items() if inner is not None}
    if isinstance(value, list):
        return [strip_none(item) for item in value]
    return value


def chunked(sequence: list[Any], size: int) -> list[list[Any]]:
    return [sequence[index : index + size] for index in range(0, len(sequence), size)]


def ingest_requests(
    client: ChronicleClient,
    requests: list[dict[str, Any]],
    batch_size: int,
) -> list[str]:
    event_ids: list[str] = []
    for batch in chunked(requests, batch_size):
        event_ids.extend(client.ingest_batch(batch))
    return event_ids


def build_task_definition_event(
    org_id: str,
    source: str,
    run_id: str,
    domain: str,
    task: dict[str, Any],
    run_timestamp: str | None,
) -> dict[str, Any]:
    return build_event_request(
        org_id=org_id,
        source=source,
        topic="task",
        event_type="tau2.task.definition",
        entities={
            "benchmark_run": run_id,
            "benchmark_domain": domain,
            "benchmark_task": task["id"],
        },
        payload={
            "taskId": task["id"],
            "description": task.get("description"),
            "userScenario": task.get("user_scenario"),
            "evaluationCriteria": task.get("evaluation_criteria"),
            "initialState": task.get("initial_state"),
        },
        timestamp=run_timestamp,
    )


def message_event_payload(
    simulation: dict[str, Any],
    task: dict[str, Any],
    message: dict[str, Any],
    run_id: str,
    domain: str,
) -> dict[str, Any]:
    return {
        "runId": run_id,
        "domain": domain,
        "taskId": simulation["task_id"],
        "trial": simulation.get("trial"),
        "simulationId": simulation["id"],
        "turnIndex": message.get("turn_idx"),
        "role": message.get("role"),
        "content": message.get("content"),
        "cost": message.get("cost"),
        "usage": message.get("usage"),
        "rawData": message.get("raw_data"),
        "taskDescription": task.get("description"),
    }


def simulation_entities(
    run_id: str,
    domain: str,
    simulation: dict[str, Any],
) -> dict[str, str]:
    task_id = simulation["task_id"]
    trial = simulation.get("trial", 0)
    return {
        "benchmark_run": run_id,
        "benchmark_domain": domain,
        "benchmark_task": task_id,
        "benchmark_simulation": simulation["id"],
        "benchmark_trial": f"{task_id}-trial-{trial}",
    }


def build_simulation_requests(
    *,
    org_id: str,
    source: str,
    run_id: str,
    domain: str,
    task: dict[str, Any],
    simulation: dict[str, Any],
) -> tuple[list[dict[str, Any]], list[tuple[int, int]], dict[int, int]]:
    requests: list[dict[str, Any]] = []
    sequence_links: list[tuple[int, int]] = []
    tool_call_indices: dict[str, int] = {}
    tool_response_links: dict[int, int] = {}

    entities = simulation_entities(run_id, domain, simulation)

    requests.append(
        build_event_request(
            org_id=org_id,
            source=source,
            topic="simulation",
            event_type="tau2.simulation.started",
            entities=entities,
            payload={
                "runId": run_id,
                "domain": domain,
                "taskId": simulation["task_id"],
                "trial": simulation.get("trial"),
                "simulationId": simulation["id"],
                "seed": simulation.get("seed"),
                "taskDescription": task.get("description"),
            },
            timestamp=simulation.get("start_time"),
        )
    )

    def append_request(payload: dict[str, Any]) -> int:
        requests.append(payload)
        if len(requests) > 1:
            sequence_links.append((len(requests) - 2, len(requests) - 1))
        return len(requests) - 1

    for message in simulation.get("messages", []):
        role = message.get("role")
        if role in {"system", "assistant", "user"}:
            message_index = append_request(
                build_event_request(
                    org_id=org_id,
                    source=source,
                    topic="message",
                    event_type=f"tau2.message.{role}",
                    entities=entities,
                    payload=message_event_payload(simulation, task, message, run_id, domain),
                    timestamp=message.get("timestamp"),
                )
            )
            for tool_call in message.get("tool_calls") or []:
                tool_call_index = append_request(
                    build_event_request(
                        org_id=org_id,
                        source=source,
                        topic="tool",
                        event_type="tau2.tool.call",
                        entities=entities,
                        payload={
                            "runId": run_id,
                            "domain": domain,
                            "taskId": simulation["task_id"],
                            "trial": simulation.get("trial"),
                            "simulationId": simulation["id"],
                            "turnIndex": message.get("turn_idx"),
                            "messageRole": role,
                            "toolCallId": tool_call.get("id"),
                            "toolName": tool_call.get("name"),
                            "arguments": tool_call.get("arguments"),
                            "requestor": tool_call.get("requestor", role),
                            "messageEventIndex": message_index,
                        },
                        timestamp=message.get("timestamp"),
                    )
                )
                if tool_call.get("id"):
                    tool_call_indices[tool_call["id"]] = tool_call_index
        elif role == "tool" and message.get("tool_messages"):
            for tool_message in message.get("tool_messages") or []:
                tool_result_index = append_request(
                    build_event_request(
                        org_id=org_id,
                        source=source,
                        topic="tool",
                        event_type="tau2.tool.result",
                        entities=entities,
                        payload={
                            "runId": run_id,
                            "domain": domain,
                            "taskId": simulation["task_id"],
                            "trial": simulation.get("trial"),
                            "simulationId": simulation["id"],
                            "turnIndex": tool_message.get("turn_idx"),
                            "toolCallId": tool_message.get("id"),
                            "content": tool_message.get("content"),
                            "requestor": tool_message.get("requestor"),
                            "error": tool_message.get("error", False),
                        },
                        timestamp=tool_message.get("timestamp"),
                    )
                )
                tool_call_id = tool_message.get("id")
                if tool_call_id and tool_call_id in tool_call_indices:
                    tool_response_links[tool_call_indices[tool_call_id]] = tool_result_index
        elif role == "tool":
            tool_result_index = append_request(
                build_event_request(
                    org_id=org_id,
                    source=source,
                    topic="tool",
                    event_type="tau2.tool.result",
                    entities=entities,
                    payload={
                        "runId": run_id,
                        "domain": domain,
                        "taskId": simulation["task_id"],
                        "trial": simulation.get("trial"),
                        "simulationId": simulation["id"],
                        "turnIndex": message.get("turn_idx"),
                        "toolCallId": message.get("id"),
                        "content": message.get("content"),
                        "requestor": message.get("requestor"),
                        "error": message.get("error", False),
                    },
                    timestamp=message.get("timestamp"),
                )
            )
            tool_call_id = message.get("id")
            if tool_call_id and tool_call_id in tool_call_indices:
                tool_response_links[tool_call_indices[tool_call_id]] = tool_result_index

    append_request(
        build_event_request(
            org_id=org_id,
            source=source,
            topic="simulation",
            event_type="tau2.simulation.completed",
            entities=entities,
            payload={
                "runId": run_id,
                "domain": domain,
                "taskId": simulation["task_id"],
                "trial": simulation.get("trial"),
                "simulationId": simulation["id"],
                "terminationReason": simulation.get("termination_reason"),
                "duration": simulation.get("duration"),
                "agentCost": simulation.get("agent_cost"),
                "userCost": simulation.get("user_cost"),
                "rewardInfo": simulation.get("reward_info"),
            },
            timestamp=simulation.get("end_time"),
        )
    )

    return requests, sequence_links, tool_response_links


def create_link_payload(
    *,
    org_id: str,
    source_event_id: str,
    target_event_id: str,
    link_type: str,
    reasoning: str,
    created_by: str,
) -> dict[str, Any]:
    return {
        "org_id": org_id,
        "source_event_id": source_event_id,
        "target_event_id": target_event_id,
        "link_type": link_type,
        "confidence": 0.99,
        "reasoning": reasoning,
        "created_by": created_by,
    }


def ingest_results_file(
    *,
    client: ChronicleClient,
    results_path: Path,
    org_id: str,
    batch_size: int,
    created_by: str,
    create_links: bool,
) -> dict[str, Any]:
    results = load_json(results_path)
    domain = tau2_domain(results)
    source = f"tau2-{slugify(domain)}"
    run_id = build_run_entity_id(results_path, results)
    run_timestamp = results.get("timestamp")
    tasks_by_id = {task["id"]: task for task in results.get("tasks", [])}

    run_request = build_event_request(
        org_id=org_id,
        source=source,
        topic="run",
        event_type="tau2.run.imported",
        entities={
            "benchmark_run": run_id,
            "benchmark_domain": domain,
        },
        payload={
            "sourceFile": str(results_path),
            "domain": domain,
            "timestamp": results.get("timestamp"),
            "info": results.get("info"),
        },
        timestamp=run_timestamp,
    )

    task_requests = [
        build_task_definition_event(org_id, source, run_id, domain, task, run_timestamp)
        for task in results.get("tasks", [])
    ]
    metadata_event_ids = ingest_requests(
        client,
        [run_request, *task_requests],
        batch_size=batch_size,
    )
    run_event_id = metadata_event_ids[0]
    task_event_ids = {
        task["id"]: metadata_event_ids[index + 1]
        for index, task in enumerate(results.get("tasks", []))
    }

    link_count = 0
    if create_links:
        for task_id, task_event_id in task_event_ids.items():
            client.create_link(
                create_link_payload(
                    org_id=org_id,
                    source_event_id=run_event_id,
                    target_event_id=task_event_id,
                    link_type=RUN_TASK_LINK_TYPE,
                    reasoning=f"Tau² run {run_id} includes task {task_id}",
                    created_by=created_by,
                )
            )
            link_count += 1

    ingested_event_count = len(metadata_event_ids)
    simulation_manifests = []

    for simulation in results.get("simulations", []):
        task = tasks_by_id[simulation["task_id"]]
        requests, sequence_links, tool_response_links = build_simulation_requests(
            org_id=org_id,
            source=source,
            run_id=run_id,
            domain=domain,
            task=task,
            simulation=simulation,
        )
        event_ids = ingest_requests(client, requests, batch_size=batch_size)
        ingested_event_count += len(event_ids)

        if create_links and event_ids:
            client.create_link(
                create_link_payload(
                    org_id=org_id,
                    source_event_id=task_event_ids[simulation["task_id"]],
                    target_event_id=event_ids[0],
                    link_type=TASK_SIMULATION_LINK_TYPE,
                    reasoning=(
                        f"Tau² task {simulation['task_id']} includes simulation {simulation['id']}"
                    ),
                    created_by=created_by,
                )
            )
            link_count += 1

            for source_index, target_index in sequence_links:
                client.create_link(
                    create_link_payload(
                        org_id=org_id,
                        source_event_id=event_ids[source_index],
                        target_event_id=event_ids[target_index],
                        link_type=SEQUENCE_LINK_TYPE,
                        reasoning=(
                            f"Chronological Tau² step for simulation {simulation['id']}"
                        ),
                        created_by=created_by,
                    )
                )
                link_count += 1

            for source_index, target_index in tool_response_links.items():
                client.create_link(
                    create_link_payload(
                        org_id=org_id,
                        source_event_id=event_ids[source_index],
                        target_event_id=event_ids[target_index],
                        link_type=TOOL_RESPONSE_LINK_TYPE,
                        reasoning=(
                            f"Tau² tool response matched tool call in simulation {simulation['id']}"
                        ),
                        created_by=created_by,
                    )
                )
                link_count += 1

        simulation_manifests.append(
            {
                "simulationId": simulation["id"],
                "taskId": simulation["task_id"],
                "trial": simulation.get("trial"),
                "eventCount": len(event_ids),
                "terminationReason": simulation.get("termination_reason"),
                "reward": (simulation.get("reward_info") or {}).get("reward"),
            }
        )

    manifest = {
        "generatedAt": utc_now_iso(),
        "sourceFile": str(results_path),
        "chronicleOrgId": org_id,
        "runId": run_id,
        "domain": domain,
        "taskCount": len(results.get("tasks", [])),
        "simulationCount": len(results.get("simulations", [])),
        "eventCount": ingested_event_count,
        "linkCount": link_count,
        "createLinks": create_links,
        "batchSize": batch_size,
        "simulations": simulation_manifests,
    }
    return manifest


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Ingest official Tau² results JSON into Chronicle's event store.",
    )
    parser.add_argument(
        "--input",
        dest="inputs",
        action="append",
        required=True,
        help="Path to a Tau² results JSON file. Repeat for multiple files.",
    )
    parser.add_argument(
        "--chronicle-url",
        required=True,
        help="Chronicle native events API base URL, e.g. http://localhost:8080",
    )
    parser.add_argument(
        "--org-id",
        required=True,
        help="Chronicle org id to use for ingested Tau² benchmark events.",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=100,
        help="Maximum number of events to send per batch ingest request.",
    )
    parser.add_argument(
        "--created-by",
        default="tau2-bench-importer",
        help="created_by value for Chronicle event links.",
    )
    parser.add_argument(
        "--no-links",
        action="store_true",
        help="Skip Chronicle event-link creation and ingest only the raw events.",
    )
    parser.add_argument(
        "--output",
        help="Optional manifest output path. Defaults to benchmarks/tau2/output/ingestion/<first-file>.json",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    client = ChronicleClient(args.chronicle_url)
    input_paths = [Path(path).resolve() for path in args.inputs]
    manifests = [
        ingest_results_file(
            client=client,
            results_path=path,
            org_id=args.org_id,
            batch_size=args.batch_size,
            created_by=args.created_by,
            create_links=not args.no_links,
        )
        for path in input_paths
    ]

    manifest_payload = {
        "generatedAt": utc_now_iso(),
        "chronicleUrl": args.chronicle_url,
        "orgId": args.org_id,
        "runs": manifests,
    }

    if args.output:
        output_path = Path(args.output).resolve()
    else:
        output_path = INGEST_OUTPUT_DIR / f"{input_paths[0].stem}-chronicle.json"
    ensure_parent(output_path)
    write_json(output_path, manifest_payload)

    print(f"Wrote Tau² ingestion manifest to {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
