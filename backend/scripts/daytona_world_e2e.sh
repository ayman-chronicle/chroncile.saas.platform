#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND="$ROOT/backend"

set -a
[[ -f "$ROOT/apps/frontend/.env.local" ]] && source "$ROOT/apps/frontend/.env.local"
[[ -f "$BACKEND/.env" ]] && source "$BACKEND/.env"
set +a

ARTIFACT_DIR="${CHRONICLE_DAYTONA_E2E_ARTIFACT_DIR:-$BACKEND/target/daytona-e2e-artifacts}"
RUN_RUNTIME_TOOLS="${CHRONICLE_DAYTONA_E2E_TOOLS_TEST:-1}"

usage() {
  cat <<'EOF'
Usage: daytona_world_e2e.sh [--image IMAGE | --snapshot SNAPSHOT] [--publish-runtime] [--tag TAG]

Runs the Daytona world replay/escape regression suite:
  - publishes or uses a Chronicle sandbox runtime image
  - boots the runtime in Daytona
  - verifies explicit proxy replay, transparent replay, write fail-closed,
    direct-IP interception, UDP/443, DNS, DoH, DoT, and exported artifacts

Required:
  DAYTONA_API_KEY

Optional:
  DAYTONA_API_URL
  DAYTONA_ORGANIZATION_ID
  CHRONICLE_DAYTONA_RUNTIME_IMAGE
  CHRONICLE_DAYTONA_RUNTIME_SNAPSHOT
  CHRONICLE_WORLD_RUNTIME_IMAGE
  CHRONICLE_WORLD_RUNTIME_SNAPSHOT
  CHRONICLE_SANDBOX_RUNTIME_IMAGE
  CHRONICLE_DAYTONA_E2E_ARTIFACT_DIR   default: backend/target/daytona-e2e-artifacts
  CHRONICLE_DAYTONA_E2E_TOOLS_TEST     default: 1

If no image or snapshot is provided, the script publishes a fresh runtime image
with backend/sandbox-image/publish-daytona.sh.
EOF
}

PUBLISH_RUNTIME=0
TAG="${CHRONICLE_SANDBOX_RUNTIME_TAG:-daytona-e2e-$(date -u +%Y%m%d%H%M%S)}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --image)
      export CHRONICLE_DAYTONA_RUNTIME_IMAGE="${2:-}"
      shift 2
      ;;
    --snapshot)
      export CHRONICLE_DAYTONA_RUNTIME_SNAPSHOT="${2:-}"
      shift 2
      ;;
    --publish-runtime)
      PUBLISH_RUNTIME=1
      shift
      ;;
    --tag)
      TAG="${2:-}"
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

if [[ -z "${DAYTONA_API_KEY:-}" ]]; then
  echo "DAYTONA_API_KEY is required" >&2
  exit 2
fi

RUNTIME_SNAPSHOT="${CHRONICLE_DAYTONA_RUNTIME_SNAPSHOT:-${CHRONICLE_WORLD_RUNTIME_SNAPSHOT:-}}"
RUNTIME_IMAGE="${CHRONICLE_DAYTONA_RUNTIME_IMAGE:-${CHRONICLE_WORLD_RUNTIME_IMAGE:-${CHRONICLE_SANDBOX_RUNTIME_IMAGE:-}}}"

mkdir -p "$ARTIFACT_DIR"
echo "Daytona E2E artifacts: $ARTIFACT_DIR"

if [[ "$PUBLISH_RUNTIME" == "1" || ( -z "$RUNTIME_SNAPSHOT" && -z "$RUNTIME_IMAGE" ) ]]; then
  publish_log="$ARTIFACT_DIR/daytona-runtime-publish.log"
  echo "Publishing fresh Daytona runtime image with tag $TAG..."
  "$BACKEND/sandbox-image/publish-daytona.sh" "$TAG" | tee "$publish_log"
  RUNTIME_IMAGE="$(sed -n 's/^  export CHRONICLE_SANDBOX_RUNTIME_IMAGE=//p' "$publish_log" | tail -1)"
  if [[ -z "$RUNTIME_IMAGE" ]]; then
    echo "could not parse CHRONICLE_SANDBOX_RUNTIME_IMAGE from $publish_log" >&2
    exit 1
  fi
  RUNTIME_SNAPSHOT=""
fi

export CHRONICLE_DAYTONA_E2E=1
export CHRONICLE_DAYTONA_E2E_ARTIFACT_DIR="$ARTIFACT_DIR"

if [[ -n "$RUNTIME_SNAPSHOT" ]]; then
  echo "Using Daytona runtime snapshot $RUNTIME_SNAPSHOT"
  export CHRONICLE_DAYTONA_RUNTIME_SNAPSHOT="$RUNTIME_SNAPSHOT"
  unset CHRONICLE_DAYTONA_RUNTIME_IMAGE
  {
    echo "CHRONICLE_DAYTONA_RUNTIME_SNAPSHOT=$RUNTIME_SNAPSHOT"
    echo "CHRONICLE_WORLD_RUNTIME_SNAPSHOT=$RUNTIME_SNAPSHOT"
  } >"$ARTIFACT_DIR/runtime.env"
else
  echo "Using Daytona runtime image $RUNTIME_IMAGE"
  export CHRONICLE_DAYTONA_RUNTIME_IMAGE="$RUNTIME_IMAGE"
  unset CHRONICLE_DAYTONA_RUNTIME_SNAPSHOT
  {
    echo "CHRONICLE_DAYTONA_RUNTIME_IMAGE=$RUNTIME_IMAGE"
    echo "CHRONICLE_WORLD_RUNTIME_IMAGE=$RUNTIME_IMAGE"
  } >"$ARTIFACT_DIR/runtime.env"
fi

test_filter="daytona_compiled_bundle_replays_and_blocks_escape_matrix"
if [[ "$RUN_RUNTIME_TOOLS" == "1" || "$RUN_RUNTIME_TOOLS" == "true" ]]; then
  test_filter=""
fi

if [[ -n "$test_filter" ]]; then
  cargo test --manifest-path "$BACKEND/Cargo.toml" -p chronicle_sandbox \
    --test daytona_escape_e2e "$test_filter" -- --ignored --nocapture
else
  cargo test --manifest-path "$BACKEND/Cargo.toml" -p chronicle_sandbox \
    --test daytona_escape_e2e -- --ignored --nocapture
fi

echo "OK: Daytona world E2E passed"
