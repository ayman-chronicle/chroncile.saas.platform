# Chronicle Platform Changelog

Rolling record of notable changes in `chronicle.platform`. Entries are kept
newest-first and grouped by date.

## 2026-03-07

### Fixed

- Deferred the dashboard sidebar clock until after mount so dashboard routes no
  longer trigger a React hydration mismatch from server/client time drift.

### Added

- Added a generic frontend analytics layer with an `AnalyticsProvider`,
  PostHog-backed adapter, early client initialization via
  `apps/frontend/instrumentation-client.ts`, and the first tracked auth event
  path through the wrapper.
- Added a local-only hidden developer tools widget that opens after repeated
  clicks in the bottom-right corner and surfaces analytics debug details such as
  the current PostHog session id and distinct id.
- Added frontend Sentry browser monitoring with tracing, replay, NextAuth-driven
  user context sync, and local developer widget diagnostics for replay and event
  state.

### Changed

- Updated the local developer diagnostics widget to use a fixed-height,
  scrollable panel with provider tabs so PostHog, Sentry, and context details
  can be inspected without one long stacked list.
- Added backend Sentry support with configurable DSN, environment, trace
  sample rate, log ingestion, and Postgres query span wiring across the Rust
  server, Fly deployments, and the local Docker stack, and raised the backend
  Rust baseline to `1.81+` for SDK compatibility.
- Renamed the frontend request boundary file from `middleware.ts` to
  `proxy.ts` so the Next.js 16 deprecation warning no longer appears during
  frontend startup and builds.
- Split Doppler local configs into explicit `dev_backend`, `dev_frontend`, and
  `dev_env_manager` variants so backend and frontend secrets no longer share the
  same dev config, and updated local sync commands to target the new names.
- Added a root `make docker-up` target that wraps the shared local compose stack
  so Postgres, backend, and frontend can be launched together with one command.
- Moved deploy assets into dedicated folders by ownership: the shared local
  compose stack now lives in `deploy/`, backend Fly and Docker assets live in
  `backend/deploy/`, and the frontend container build lives in
  `apps/frontend/deploy/`.
- Consolidated frontend-owned config under `apps/frontend/`, including the
  Vercel config and a checked-in `.env.example`, and removed legacy root-level
  clutter such as `package-lock.json`, `.eslintrc.json`, and the tracked webhook
  debug log.
- Upgraded `apps/frontend` to Next.js 16.1, switched its local lint script from
  `next lint` to the ESLint CLI required by Next 16, and added the PostHog
  browser SDK dependency.

### Docs

- Added a dedicated getting-started onboarding guide for first-time local setup
  and split the main README so it links to the dedicated setup flow.
- Moved the onboarding guide into `docs/getting-started.md` and refreshed
  deploy-related commands and architecture references to use the new config
  locations.
- Started a rolling changelog for `chronicle.platform` and added a project rule
  so future notable changes are recorded here.
- Refreshed the platform README into a documentation hub with an accurate
  monorepo map, current local development commands, and links to deeper
  frontend, backend, and architecture docs.
