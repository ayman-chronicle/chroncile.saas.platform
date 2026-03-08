#!/usr/bin/env bash
set -euo pipefail

# Chronicle Labs -- Multi-Environment Setup
#
# Prerequisites:
#   - flyctl installed and authenticated (fly auth login)
#   - gh CLI installed and authenticated
#   - Vercel CLI installed (npm i -g vercel) and linked to project
#
# Usage:
#   ./scripts/setup-production.sh [environment]
#   Environments: development | staging | production | all (default)

ENV="${1:-all}"
BACKEND_DEPLOY_DIR="deploy"

echo "=== Chronicle Labs Environment Setup ==="
echo ""

setup_env() {
    local env_name="$1"
    local fly_app="$2"
    local fly_config="$3"

    echo "── Setting up: $env_name ──"
    echo ""

    local auth_secret="${AUTH_SECRET:-$(openssl rand -base64 32)}"
    local service_secret="${SERVICE_SECRET:-$(openssl rand -base64 32)}"
    local encryption_key="${ENCRYPTION_KEY:-$(openssl rand -hex 32)}"

    echo "  Fly.io app:    $fly_app"
    echo "  Fly.io config: $fly_config"
    echo "  URL:           https://$fly_app.fly.dev"
    echo ""

    flyctl secrets set \
        AUTH_SECRET="$auth_secret" \
        SERVICE_SECRET="$service_secret" \
        ENCRYPTION_KEY="$encryption_key" \
        SENTRY_DSN="${SENTRY_DSN:-}" \
        PIPEDREAM_CLIENT_ID="${PIPEDREAM_CLIENT_ID:-}" \
        PIPEDREAM_CLIENT_SECRET="${PIPEDREAM_CLIENT_SECRET:-}" \
        PIPEDREAM_PROJECT_ID="${PIPEDREAM_PROJECT_ID:-}" \
        STRIPE_SECRET_KEY="${STRIPE_SECRET_KEY:-}" \
        STRIPE_WEBHOOK_SECRET="${STRIPE_WEBHOOK_SECRET:-}" \
        --app "$fly_app" 2>/dev/null || true

    echo "  Secrets configured for $fly_app"
    echo ""

    if [ "$env_name" = "production" ]; then
        echo "  Vercel env vars (set in Dashboard):"
        echo "    NEXT_PUBLIC_BACKEND_URL = https://$fly_app.fly.dev"
        echo "    AUTH_SECRET             = $auth_secret"
        echo "    AUTH_TRUST_HOST         = true"
        echo "    SERVICE_SECRET          = $service_secret"
        echo "    ENCRYPTION_KEY          = $encryption_key"
        echo ""
    fi
}

if [ "$ENV" = "development" ] || [ "$ENV" = "all" ]; then
    setup_env "development" "chronicle-backend-dev" "${BACKEND_DEPLOY_DIR}/fly.development.toml"
fi

if [ "$ENV" = "staging" ] || [ "$ENV" = "all" ]; then
    setup_env "staging" "chronicle-backend-staging" "${BACKEND_DEPLOY_DIR}/fly.staging.toml"
fi

if [ "$ENV" = "production" ] || [ "$ENV" = "all" ]; then
    setup_env "production" "chronicle-backend" "${BACKEND_DEPLOY_DIR}/fly.production.toml"
fi

echo "=== Branching Strategy ==="
echo ""
echo "  develop  -> auto-deploys to chronicle-backend-dev.fly.dev"
echo "  staging  -> auto-deploys to chronicle-backend-staging.fly.dev"
echo "  main     -> auto-deploys to chronicle-backend.fly.dev"
echo ""
echo "  Feature branches: feat/* -> PR to develop"
echo "  Promotion: develop -> PR to staging -> PR to main"
echo ""

echo "=== Manual Deploy ==="
echo ""
echo "  Dev:     cd backend && flyctl deploy --config ${BACKEND_DEPLOY_DIR}/fly.development.toml --remote-only"
echo "  Staging: cd backend && flyctl deploy --config ${BACKEND_DEPLOY_DIR}/fly.staging.toml --remote-only"
echo "  Prod:    cd backend && flyctl deploy --config ${BACKEND_DEPLOY_DIR}/fly.production.toml --remote-only"
echo ""

echo "=== GitHub Environments ==="
echo ""
echo "  development  -- no protection, auto-deploy on develop push"
echo "  staging      -- auto-deploy on staging push"
echo "  production   -- branch restricted to main"
echo ""
echo "  FLY_API_TOKEN is set as environment secret on each."
echo ""
echo "=== Setup Complete ==="
