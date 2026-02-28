#!/usr/bin/env bash
set -euo pipefail

# Captures request/response pairs from the Next.js API routes as golden master
# fixtures for contract testing during the Rust backend migration.
#
# Prerequisites:
#   - Next.js dev server running (yarn dev:frontend)
#   - Valid test credentials in .env or passed as env vars
#
# Usage:
#   TEST_EMAIL=test@example.com TEST_PASSWORD=password123 ./scripts/capture-api-baselines.sh

BASELINES_DIR="backend/tests/baselines"
BASE_URL="${BASE_URL:-http://localhost:3000}"

mkdir -p "$BASELINES_DIR"

capture() {
    local name="$1"
    local method="$2"
    local path="$3"
    local body="${4:-}"
    local auth="${5:-}"

    local curl_args=(-s -w '\n{"_status_code": %{http_code}}' -X "$method")

    if [ -n "$auth" ]; then
        curl_args+=(-H "Authorization: Bearer $auth")
    fi

    curl_args+=(-H "Content-Type: application/json")

    if [ -n "$body" ]; then
        curl_args+=(-d "$body")
    fi

    local output
    output=$(curl "${curl_args[@]}" "${BASE_URL}${path}" 2>/dev/null || true)

    local response_body
    response_body=$(echo "$output" | head -n -1)
    local status_line
    status_line=$(echo "$output" | tail -n 1)
    local status_code
    status_code=$(echo "$status_line" | sed 's/.*"_status_code": \([0-9]*\).*/\1/')

    cat > "$BASELINES_DIR/${name}.json" <<FIXTURE
{
  "method": "$method",
  "path": "$path",
  "body": $( [ -n "$body" ] && echo "$body" || echo "null" ),
  "status": $status_code,
  "response": $( [ -n "$response_body" ] && echo "$response_body" || echo "null" )
}
FIXTURE

    echo "Captured: $name ($method $path) -> $status_code"
}

echo "Capturing API baselines from $BASE_URL"
echo "Output directory: $BASELINES_DIR"
echo ""

# Auth - signup
capture "auth_signup" "POST" "/api/auth/signup" \
    '{"email":"baseline-test@example.com","password":"TestPass123!","name":"Baseline Test","orgName":"Baseline Org"}'

# Auth - login (via NextAuth credentials)
capture "auth_login_invalid" "POST" "/api/auth/callback/credentials" \
    '{"email":"nonexistent@example.com","password":"wrongpass"}'

# Get a session token for authenticated routes
echo ""
echo "Authenticating for protected route captures..."
TOKEN="${TEST_TOKEN:-}"

if [ -z "$TOKEN" ]; then
    echo "No TEST_TOKEN set. Capturing unauthenticated responses for protected routes."
fi

# Dashboard
capture "dashboard_stats" "GET" "/api/dashboard/stats" "" "$TOKEN"
capture "dashboard_activity" "GET" "/api/dashboard/activity" "" "$TOKEN"

# Connections
capture "connections_list" "GET" "/api/connections" "" "$TOKEN"

# Runs
capture "runs_list" "GET" "/api/runs" "" "$TOKEN"

# Settings
capture "settings_agent_endpoint" "GET" "/api/settings/agent-endpoint" "" "$TOKEN"

# Sandbox
capture "sandbox_list" "GET" "/api/sandbox" "" "$TOKEN"

# Labeling
capture "labeling_stats" "GET" "/api/labeling/stats" "" "$TOKEN"
capture "labeling_traces" "GET" "/api/labeling/traces" "" "$TOKEN"

# Audit
capture "audit_list" "GET" "/api/audit" "" "$TOKEN"

echo ""
echo "Baseline capture complete. $(ls -1 "$BASELINES_DIR"/*.json 2>/dev/null | wc -l | tr -d ' ') fixtures saved to $BASELINES_DIR/"
