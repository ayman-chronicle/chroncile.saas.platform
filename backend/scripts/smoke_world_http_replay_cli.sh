#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND="$ROOT/backend"
PORT="${API_PORT:-19091}"
BASE_URL="http://127.0.0.1:${PORT}"
TOKEN="${CHRONICLE_DEV_TOKEN:-devtoken}"
WORKDIR="$(mktemp -d /tmp/chronicle-world-http-smoke.XXXXXX)"
LOG="$WORKDIR/backend.log"
SANDBOX_DRIVER="${CHRONICLE_SMOKE_SANDBOX_DRIVER:-docker}"
SMOKE_ARTIFACT_DIR=""

usage() {
  cat <<'EOF'
Usage: smoke_world_http_replay_cli.sh [--driver docker|daytona]

Runs the HTTP replay product-path smoke through the Chronicle CLI:
environment publish -> environment compile -> backtest job -> HTTP replay export.

Environment:
  API_PORT                         default: 19091
  CHRONICLE_DEV_TOKEN              default: devtoken
  CHRONICLE_SMOKE_SANDBOX_DRIVER   default: docker
  CHRONICLE_WORLD_RUNTIME_IMAGE    runtime image override
  CHRONICLE_FORCE_RUNTIME_BUILD    set to 1 to rebuild the local Docker runtime
  CHRONICLE_WORLD_RUNTIME_SNAPSHOT Daytona snapshot override
  CHRONICLE_DAYTONA_RUNTIME_IMAGE  Daytona image fallback
  CHRONICLE_DAYTONA_RUNTIME_SNAPSHOT Daytona snapshot fallback

For --driver daytona, DAYTONA_API_KEY is required. If no Daytona runtime
image/snapshot is configured, the script publishes a fresh runtime image via
backend/sandbox-image/publish-daytona.sh.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --driver)
      SANDBOX_DRIVER="${2:-}"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

case "$SANDBOX_DRIVER" in
  docker|daytona) ;;
  *)
    echo "unsupported --driver: $SANDBOX_DRIVER" >&2
    exit 2
    ;;
esac

cleanup() {
  if [[ -n "$SMOKE_ARTIFACT_DIR" ]]; then
    mkdir -p "$SMOKE_ARTIFACT_DIR"
    cp -R "$WORKDIR"/. "$SMOKE_ARTIFACT_DIR"/
    echo "Persisted HTTP replay smoke artifacts to $SMOKE_ARTIFACT_DIR"
  fi
  if [[ -n "${BACKEND_PID:-}" ]]; then
    kill "$BACKEND_PID" >/dev/null 2>&1 || true
    wait "$BACKEND_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

set -a
[[ -f "$ROOT/apps/frontend/.env.local" ]] && source "$ROOT/apps/frontend/.env.local"
[[ -f "$BACKEND/.env" ]] && source "$BACKEND/.env"
set +a

SMOKE_ARTIFACT_DIR="${CHRONICLE_SMOKE_ARTIFACT_DIR:-}"

RUNTIME_IMAGE=""
RUNTIME_SNAPSHOT=""

if [[ "$SANDBOX_DRIVER" == "docker" ]]; then
  if ! command -v docker >/dev/null 2>&1; then
    echo "docker is required for the Docker smoke" >&2
    exit 1
  fi
  CONFIGURED_RUNTIME_IMAGE="${CHRONICLE_WORLD_RUNTIME_IMAGE:-}"
  RUNTIME_IMAGE="${CONFIGURED_RUNTIME_IMAGE:-chronicle/sandbox-runtime:product-smoke}"
  if [[ "${CHRONICLE_FORCE_RUNTIME_BUILD:-0}" == "1" || -z "$CONFIGURED_RUNTIME_IMAGE" ]]; then
    echo "Building runtime image $RUNTIME_IMAGE..."
    (cd "$BACKEND" && docker build -f sandbox-image/Dockerfile -t "$RUNTIME_IMAGE" . >/dev/null)
  elif ! docker image inspect "$RUNTIME_IMAGE" >/dev/null 2>&1; then
    echo "runtime image not found: $RUNTIME_IMAGE" >&2
    echo "build it with: (cd backend && docker build -f sandbox-image/Dockerfile -t $RUNTIME_IMAGE .)" >&2
    exit 1
  fi
else
  if [[ -z "${DAYTONA_API_KEY:-}" ]]; then
    echo "DAYTONA_API_KEY is required for --driver daytona" >&2
    exit 1
  fi
  RUNTIME_SNAPSHOT="${CHRONICLE_WORLD_RUNTIME_SNAPSHOT:-${CHRONICLE_DAYTONA_RUNTIME_SNAPSHOT:-}}"
  RUNTIME_IMAGE="${CHRONICLE_WORLD_RUNTIME_IMAGE:-${CHRONICLE_DAYTONA_RUNTIME_IMAGE:-${CHRONICLE_SANDBOX_RUNTIME_IMAGE:-}}}"
  if [[ -n "$RUNTIME_SNAPSHOT" ]]; then
    echo "Using Daytona runtime snapshot $RUNTIME_SNAPSHOT"
  elif [[ -n "$RUNTIME_IMAGE" ]]; then
    echo "Using Daytona runtime image $RUNTIME_IMAGE"
  else
    if ! command -v docker >/dev/null 2>&1; then
      echo "docker is required to publish the Daytona runtime image" >&2
      exit 1
    fi
    tag="http-smoke-$(date -u +%Y%m%d%H%M%S)"
    publish_log="$WORKDIR/daytona-publish.log"
    echo "Publishing fresh Daytona runtime image with tag $tag..."
    "$BACKEND/sandbox-image/publish-daytona.sh" "$tag" | tee "$publish_log"
    RUNTIME_IMAGE="$(sed -n 's/^  export CHRONICLE_SANDBOX_RUNTIME_IMAGE=//p' "$publish_log" | tail -1)"
    if [[ -z "$RUNTIME_IMAGE" ]]; then
      echo "could not parse published Daytona runtime image from $publish_log" >&2
      exit 1
    fi
  fi
fi

mkdir -p "$WORKDIR/tests"

cat >"$WORKDIR/environment.toml" <<'EOF'
slug = "http-replay-smoke"
label = "HTTP Replay Smoke"
description = "CLI product-path smoke for HTTP replay and fail-closed coverage"
version = "v1"
status = "published"

[spec.interception]
regularProxyPort = 8888
transparentProxyPort = 8889
installCa = true

[[spec.services]]
name = "example"
authorities = ["api.example.com"]
EOF

cat >"$WORKDIR/agent.sh" <<'SH'
set -euo pipefail
mkdir -p "$WORK_DIR"

curl -fsS --max-time 15 \
  "https://api.example.com/v1/items?limit=10" \
  >"$WORK_DIR/replay.json"
grep -q "item_1" "$WORK_DIR/replay.json"

patch_status="$(curl -sS --max-time 15 \
  -o "$WORK_DIR/patch.json" \
  -w "%{http_code}" \
  -X PATCH "https://api.example.com/v1/items/item_1" \
  -H "content-type: application/json" \
  --data '{"label":"Patched password reset guide"}')"
test "$patch_status" = "200"
grep -q '"patched":true' "$WORK_DIR/patch.json"

write_status="$(curl -sS --max-time 15 \
  -o "$WORK_DIR/write-fail.json" \
  -w "%{http_code}" \
  -X POST "https://api.example.com/v1/items" \
  -H "content-type: application/json" \
  --data '{"id":"new"}')"
test "$write_status" = "501"

blocked_status="$(curl -sS --max-time 15 \
  -o "$WORK_DIR/blocked.json" \
  -w "%{http_code}" \
  "https://unknown.example.com/escape")"
test "$blocked_status" = "502"
SH

cat >"$WORKDIR/tests/test.sh" <<'SH'
#!/usr/bin/env bash
set -euo pipefail

mkdir -p /tmp/chronicle/logs/verifier
python3 - <<'PY'
import json
from pathlib import Path

coverage = json.loads(Path("/tmp/chronicle/world_artifacts/coverage.json").read_text())
interactions = Path("/tmp/chronicle/world_artifacts/interactions.jsonl").read_text()
by_match = coverage.get("byMatchKind", {})

assert int(by_match.get("replay", 0)) >= 2, coverage
assert int(by_match.get("unmatched", 0)) >= 1, coverage
assert int(by_match.get("blocked", 0)) >= 1, coverage
assert '"matchKind":"replay"' in interactions, interactions
assert '"matchKind":"unmatched"' in interactions, interactions
assert '"matchKind":"blocked"' in interactions, interactions
assert '"methodPath":"GET /v1/items?limit=10"' in interactions, interactions
assert '"methodPath":"PATCH /v1/items/item_1"' in interactions, interactions

Path("/tmp/chronicle/logs/verifier/reward.txt").write_text("1\n")
PY
SH
chmod +x "$WORKDIR/tests/test.sh"

cat >"$WORKDIR/recipe.toml" <<'EOF'
name = "__JOB_NAME__"
n-concurrent = 1
sandbox-driver = "__SANDBOX_DRIVER__"
tests-dir = "__TESTS_DIR__"

[recipe]
mode = "replay"
name = "__JOB_NAME__"
graders = []

[recipe.environment]
id = "__ENV_ID__"
label = "HTTP Replay Smoke"
versionId = "__VERSION_ID__"

[recipe.data]
kind = "dataset"
dataset = "ds_demo"
dataset-label = "Demo Dataset"
sources = []
scenarios = []

[[recipe.agents]]
id = "agent_v1"
label = "Agent v1"
notes = "world HTTP replay smoke"
hue = "#3b82f6"
role = "baseline"

[[cases]]
case-id = "trc_password_reset"
case-cluster = "smoke"
instruction = "Exercise Chronicle HTTP replay."
EOF

python3 - "$WORKDIR/recipe.toml" "$WORKDIR/tests" "$SANDBOX_DRIVER" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
tests = sys.argv[2]
driver = sys.argv[3]
text = path.read_text()
text = text.replace("__TESTS_DIR__", tests)
text = text.replace("__SANDBOX_DRIVER__", driver)
text = text.replace("__JOB_NAME__", f"world-http-replay-cli-smoke-{driver}")
path.write_text(text)
PY

echo "Building backend and CLI..."
(cd "$BACKEND" && cargo build -p chronicle_backend -p chronicle_cli >/dev/null)

export API_HOST=127.0.0.1
export API_PORT="$PORT"
export EVENTS_BACKEND_MODE=memory
export SAAS_BACKEND_MODE=memory
export CHRONICLE_DEV_TOKEN="$TOKEN"
if [[ -n "$RUNTIME_SNAPSHOT" ]]; then
  export CHRONICLE_WORLD_RUNTIME_SNAPSHOT="$RUNTIME_SNAPSHOT"
  unset CHRONICLE_WORLD_RUNTIME_IMAGE
else
  export CHRONICLE_WORLD_RUNTIME_IMAGE="$RUNTIME_IMAGE"
  unset CHRONICLE_WORLD_RUNTIME_SNAPSHOT
fi
export CHRONICLE_WORLD_INTERCEPT=strict
export CHRONICLE_AGENT_SCRIPT="$(cat "$WORKDIR/agent.sh")"
export RUST_LOG="${RUST_LOG:-chronicle_backend=info,chronicle_api=info,chronicle_orchestrator=info,chronicle_sandbox=info}"

"$BACKEND/target/debug/chronicle-backend" >"$LOG" 2>&1 &
BACKEND_PID=$!

echo "Waiting for backend on $BASE_URL..."
for _ in $(seq 1 100); do
  if "$BACKEND/target/debug/chronicle" --base-url "$BASE_URL" --token "$TOKEN" --format json health >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
done
"$BACKEND/target/debug/chronicle" --base-url "$BASE_URL" --token "$TOKEN" --format json health >/dev/null

echo "Publishing HTTP replay environment..."
"$BACKEND/target/debug/chronicle" \
  --base-url "$BASE_URL" \
  --token "$TOKEN" \
  --format json \
  environments publish "$WORKDIR/environment.toml" >"$WORKDIR/published.json"

python3 - "$WORKDIR/published.json" "$WORKDIR/recipe.toml" <<'PY'
import json
import sys
from pathlib import Path

published = json.load(open(sys.argv[1]))
recipe = Path(sys.argv[2])
text = recipe.read_text()
text = text.replace("__ENV_ID__", published["environment"]["id"])
text = text.replace("__VERSION_ID__", published["version"]["id"])
recipe.write_text(text)
PY

echo "Compiling published HTTP replay environment..."
"$BACKEND/target/debug/chronicle" \
  --base-url "$BASE_URL" \
  --token "$TOKEN" \
  --format json \
  environments compile http-replay-smoke --version v1 --dataset ds_demo --scenario trc_password_reset \
  >"$WORKDIR/compiled.json"

python3 - "$WORKDIR/compiled.json" <<'PY'
import json
import sys

compiled = json.load(open(sys.argv[1]))
assert compiled["packageUri"].startswith("file://"), compiled
assert compiled["sizeBytes"] > 0, compiled
assert "world.no_http_captures" not in compiled.get("warnings", []), compiled
paths = {file["path"] for file in compiled["manifest"]["files"]}
assert any(path.startswith("services/") and path.endswith("/replay_index.sqlite") for path in paths), compiled["manifest"]
PY

echo "Submitting world-backed HTTP replay job..."
"$BACKEND/target/debug/chronicle" \
  --base-url "$BASE_URL" \
  --token "$TOKEN" \
  --format json \
  jobs run "$WORKDIR/recipe.toml" >"$WORKDIR/submitted.json"

JOB_ID="$(python3 - "$WORKDIR/submitted.json" <<'PY'
import json, sys
doc = json.load(open(sys.argv[1]))
print(doc["jobId"])
PY
)"

echo "Waiting for job $JOB_ID..."
for _ in $(seq 1 180); do
  "$BACKEND/target/debug/chronicle" \
    --base-url "$BASE_URL" \
    --token "$TOKEN" \
    --format json \
    jobs show "$JOB_ID" >"$WORKDIR/job.json"
  STATUS="$(python3 - "$WORKDIR/job.json" <<'PY'
import json, sys
print(json.load(open(sys.argv[1]))["job"]["status"])
PY
)"
  case "$STATUS" in
    succeeded|failed|cancelled|compilefailed) break ;;
  esac
  sleep 0.5
done

ARTIFACT_URI="$(python3 - "$WORKDIR/job.json" <<'PY'
import json
import sys

doc = json.load(open(sys.argv[1]))
assert doc["job"]["status"] == "succeeded", doc["job"]
assert doc["trials"] and doc["trials"][0]["status"] == "succeeded", doc["trials"]
assert doc["trials"][0].get("worldBundleId"), doc["trials"][0]
assert doc["trials"][0].get("currentWorldRunId"), doc["trials"][0]

rewards_by_trial = doc.get("rewards", {})
assert rewards_by_trial, doc
rewards = next(iter(rewards_by_trial.values()))
assert float(rewards.get("reward_world_coverage", 0)) > 0, rewards
assert float(rewards.get("reward_world_confidence", 0)) > 0, rewards
assert float(rewards.get("reward_world_contract", 1)) == 0.0, rewards
assert float(rewards.get("reward_world_gates_passed", 1)) == 0.0, rewards
assert float(rewards.get("world_http_replay", 0)) >= 2.0, rewards
assert float(rewards.get("world_http_unmatched", 0)) >= 1.0, rewards
assert float(rewards.get("world_http_blocked", 0)) >= 1.0, rewards
assert float(rewards.get("world_forbidden_writes", 0)) >= 1.0, rewards
assert float(rewards.get("world_contract_violations", 0)) >= 1.0, rewards

world_runs = [
    run
    for runs in doc.get("worldRuns", {}).values()
    for run in runs
]
assert world_runs and world_runs[0]["status"] == "exported", world_runs

interactions_by_run = doc.get("interactions", {})
assert interactions_by_run, doc
interaction_rows = [row for rows in interactions_by_run.values() for row in rows]
assert any(row.get("matchKind") == "replay" for row in interaction_rows), interaction_rows
assert any(row.get("matchKind") == "unmatched" for row in interaction_rows), interaction_rows
assert any(row.get("matchKind") == "blocked" for row in interaction_rows), interaction_rows
assert any(row.get("methodPath") == "GET /v1/items?limit=10" for row in interaction_rows), interaction_rows
assert any(row.get("methodPath") == "PATCH /v1/items/item_1" for row in interaction_rows), interaction_rows

artifact_uri = None
for artifacts in doc.get("artifacts", {}).values():
    for artifact in artifacts:
        if artifact.get("contentType") == "application/vnd.chronicle.world-artifacts":
            artifact_uri = artifact["path"]
assert artifact_uri, doc.get("artifacts")
print(artifact_uri)
PY
)"

ARTIFACT_PATH="${ARTIFACT_URI#file://}"
ARTIFACT_DIR="$WORKDIR/world-artifacts"
mkdir -p "$ARTIFACT_DIR"
tar -xzf "$ARTIFACT_PATH" -C "$ARTIFACT_DIR"

python3 - "$ARTIFACT_DIR" <<'PY'
import json
import sys
from pathlib import Path

root = Path(sys.argv[1])
coverage = json.loads((root / "coverage.json").read_text())
interactions = (root / "interactions.jsonl").read_text()
by_match = coverage.get("byMatchKind", {})
assert int(by_match.get("replay", 0)) >= 2, coverage
assert int(by_match.get("unmatched", 0)) >= 1, coverage
assert int(by_match.get("blocked", 0)) >= 1, coverage
assert '"matchKind":"replay"' in interactions, interactions
assert '"matchKind":"unmatched"' in interactions, interactions
assert '"matchKind":"blocked"' in interactions, interactions
assert '"methodPath":"GET /v1/items?limit=10"' in interactions, interactions
assert '"methodPath":"PATCH /v1/items/item_1"' in interactions, interactions
PY

echo "OK: job=$JOB_ID artifact=$ARTIFACT_URI"
