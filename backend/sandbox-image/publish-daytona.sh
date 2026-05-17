#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  cat <<'EOF'
Usage: publish-daytona.sh [tag]

Build and publish the Chronicle sandbox runtime image to Daytona's transient
registry using GET /docker-registry/registry-push-access.

Required:
  DAYTONA_API_KEY

Optional:
  DAYTONA_API_URL                  default: https://app.daytona.io/api
  DAYTONA_ORGANIZATION_ID
  CHRONICLE_SANDBOX_RUNTIME_NAME   default: chronicle/sandbox-runtime
  CHRONICLE_SANDBOX_RUNTIME_TAG    default: first arg or v1
  CHRONICLE_SANDBOX_RUNTIME_PLATFORM default: linux/amd64
  CHRONICLE_SANDBOX_RUNTIME_USE_BUILDX default: auto
  CONTAINER_CLI                    default: docker

The script prints CHRONICLE_SANDBOX_RUNTIME_IMAGE for backend use.
EOF
  exit 0
fi

DAYTONA_API_URL="${DAYTONA_API_URL:-https://app.daytona.io/api}"
IMAGE_NAME="${CHRONICLE_SANDBOX_RUNTIME_NAME:-chronicle/sandbox-runtime}"
IMAGE_TAG="${CHRONICLE_SANDBOX_RUNTIME_TAG:-${1:-v1}}"
IMAGE_PLATFORM="${CHRONICLE_SANDBOX_RUNTIME_PLATFORM:-linux/amd64}"
USE_BUILDX="${CHRONICLE_SANDBOX_RUNTIME_USE_BUILDX:-auto}"
CONTAINER_CLI="${CONTAINER_CLI:-docker}"

if [[ -z "${DAYTONA_API_KEY:-}" ]]; then
  echo "DAYTONA_API_KEY is required" >&2
  exit 2
fi

if ! command -v "$CONTAINER_CLI" >/dev/null 2>&1; then
  echo "container CLI '$CONTAINER_CLI' was not found" >&2
  exit 2
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required" >&2
  exit 2
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
export DOCKER_CONFIG="$tmp/docker-config"
mkdir -p "$DOCKER_CONFIG"
if [[ -d "${HOME}/.docker/cli-plugins" ]]; then
  ln -s "${HOME}/.docker/cli-plugins" "$DOCKER_CONFIG/cli-plugins"
fi
if [[ -z "${DOCKER_HOST:-}" && -S "${HOME}/.docker/run/docker.sock" ]]; then
  export DOCKER_HOST="unix://${HOME}/.docker/run/docker.sock"
fi

access_json="$tmp/daytona-registry-access.json"
curl_args=(
  -fsSL
  -H "Authorization: Bearer ${DAYTONA_API_KEY}"
  -H "Content-Type: application/json"
)
if [[ -n "${DAYTONA_ORGANIZATION_ID:-}" ]]; then
  curl_args+=(-H "X-Daytona-Organization-ID: ${DAYTONA_ORGANIZATION_ID}")
fi

echo "Requesting Daytona registry push access..."
curl "${curl_args[@]}" \
  "${DAYTONA_API_URL%/}/docker-registry/registry-push-access" \
  > "$access_json"

eval "$(
  ACCESS_JSON="$access_json" IMAGE_NAME="$IMAGE_NAME" IMAGE_TAG="$IMAGE_TAG" python3 - <<'PY'
import json
import os
import shlex

with open(os.environ["ACCESS_JSON"], "r", encoding="utf-8") as f:
    access = json.load(f)

registry_url = access["registryUrl"].strip().rstrip("/")
registry_host = registry_url.removeprefix("https://").removeprefix("http://")
project = access.get("project", "").strip("/")
image_name = os.environ["IMAGE_NAME"].strip("/")
tag = os.environ["IMAGE_TAG"]
image_parts = [registry_host]
if project:
    image_parts.append(project)
image_parts.append(image_name)
image_ref = "/".join(image_parts) + ":" + tag

values = {
    "DAYTONA_REGISTRY_HOST": registry_host,
    "DAYTONA_REGISTRY_USERNAME": access["username"],
    "DAYTONA_REGISTRY_SECRET": access["secret"],
    "DAYTONA_REGISTRY_ID": access["registryId"],
    "DAYTONA_REGISTRY_PROJECT": project,
    "DAYTONA_REGISTRY_EXPIRES_AT": access["expiresAt"],
    "CHRONICLE_SANDBOX_RUNTIME_IMAGE": image_ref,
}
for key, value in values.items():
    print(f"{key}={shlex.quote(value)}")
PY
)"

echo "Logging into Daytona registry ${DAYTONA_REGISTRY_HOST}..."
printf '%s' "$DAYTONA_REGISTRY_SECRET" \
  | "$CONTAINER_CLI" login "$DAYTONA_REGISTRY_HOST" \
      --username "$DAYTONA_REGISTRY_USERNAME" \
      --password-stdin >/dev/null

if [[ "$USE_BUILDX" == "auto" ]]; then
  if "$CONTAINER_CLI" buildx version >/dev/null 2>&1; then
    USE_BUILDX=1
  else
    USE_BUILDX=0
  fi
fi

if [[ "$USE_BUILDX" == "1" || "$USE_BUILDX" == "true" ]]; then
  echo "Building and pushing ${CHRONICLE_SANDBOX_RUNTIME_IMAGE} for ${IMAGE_PLATFORM} with buildx..."
  "$CONTAINER_CLI" buildx build \
    --platform "$IMAGE_PLATFORM" \
    --push \
    -f "$SCRIPT_DIR/Dockerfile" \
    -t "$CHRONICLE_SANDBOX_RUNTIME_IMAGE" \
    "$BACKEND_DIR"
else
  echo "Building ${CHRONICLE_SANDBOX_RUNTIME_IMAGE} for ${IMAGE_PLATFORM}..."
  "$CONTAINER_CLI" build \
    --platform "$IMAGE_PLATFORM" \
    -f "$SCRIPT_DIR/Dockerfile" \
    -t "$CHRONICLE_SANDBOX_RUNTIME_IMAGE" \
    "$BACKEND_DIR"

  echo "Pushing ${CHRONICLE_SANDBOX_RUNTIME_IMAGE}..."
  "$CONTAINER_CLI" push "$CHRONICLE_SANDBOX_RUNTIME_IMAGE"
fi

cat <<EOF
Published Chronicle sandbox runtime:
  image: ${CHRONICLE_SANDBOX_RUNTIME_IMAGE}
  registryId: ${DAYTONA_REGISTRY_ID}
  project: ${DAYTONA_REGISTRY_PROJECT}
  pushAccessExpiresAt: ${DAYTONA_REGISTRY_EXPIRES_AT}

Use this image for world-backed Daytona runs:
  export CHRONICLE_SANDBOX_RUNTIME_IMAGE=${CHRONICLE_SANDBOX_RUNTIME_IMAGE}
EOF
