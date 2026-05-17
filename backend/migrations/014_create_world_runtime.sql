-- World simulator runtime schema.
--
-- Adds immutable environment versions, content-addressed world
-- bundles, and attempt-scoped world-run / interaction records. The
-- rollout is opt-in: legacy backtests keep NULL world columns.

CREATE TABLE IF NOT EXISTS "Environment" (
    id TEXT PRIMARY KEY,
    "tenantId" TEXT NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
    slug TEXT NOT NULL,
    label TEXT NOT NULL,
    description TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),
    UNIQUE ("tenantId", slug)
);

CREATE INDEX IF NOT EXISTS "Environment_tenantId_idx"
    ON "Environment" ("tenantId");

CREATE TABLE IF NOT EXISTS "EnvironmentVersion" (
    id TEXT PRIMARY KEY,
    "environmentId" TEXT NOT NULL REFERENCES "Environment"(id) ON DELETE CASCADE,
    "tenantId" TEXT NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
    version TEXT NOT NULL,
    spec JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("tenantId", "environmentId", version)
);

CREATE INDEX IF NOT EXISTS "EnvironmentVersion_tenantId_idx"
    ON "EnvironmentVersion" ("tenantId");
CREATE INDEX IF NOT EXISTS "EnvironmentVersion_environmentId_idx"
    ON "EnvironmentVersion" ("environmentId");

CREATE TABLE IF NOT EXISTS "WorldBundle" (
    id TEXT PRIMARY KEY,
    "tenantId" TEXT NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
    "environmentVersionId" TEXT NOT NULL REFERENCES "EnvironmentVersion"(id) ON DELETE CASCADE,
    "datasetSnapshotId" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    sha256 TEXT NOT NULL,
    uri TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL DEFAULT 0,
    manifest JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    UNIQUE ("tenantId", sha256)
);

CREATE INDEX IF NOT EXISTS "WorldBundle_tenantId_environmentVersionId_idx"
    ON "WorldBundle" ("tenantId", "environmentVersionId");
CREATE INDEX IF NOT EXISTS "WorldBundle_tenantId_sha256_idx"
    ON "WorldBundle" ("tenantId", sha256);

ALTER TABLE "BacktestJob"
    ADD COLUMN IF NOT EXISTS "environmentVersionId" TEXT REFERENCES "EnvironmentVersion"(id) ON DELETE SET NULL;

ALTER TABLE "BacktestTrial"
    ADD COLUMN IF NOT EXISTS "worldBundleId" TEXT REFERENCES "WorldBundle"(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS "currentWorldRunId" TEXT;

CREATE TABLE IF NOT EXISTS "BacktestTrialWorldRun" (
    id TEXT PRIMARY KEY,
    "trialId" TEXT NOT NULL REFERENCES "BacktestTrial"(id) ON DELETE CASCADE,
    attempt INTEGER NOT NULL DEFAULT 0,
    "worldBundleId" TEXT NOT NULL REFERENCES "WorldBundle"(id) ON DELETE CASCADE,
    "faultScenarioId" TEXT,
    status TEXT NOT NULL DEFAULT 'starting',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "exitCode" INTEGER,
    "logsUri" TEXT,
    "exportUri" TEXT,
    coverage JSONB
);

CREATE INDEX IF NOT EXISTS "BacktestTrialWorldRun_trialId_idx"
    ON "BacktestTrialWorldRun" ("trialId");
CREATE INDEX IF NOT EXISTS "BacktestTrialWorldRun_trialId_attempt_idx"
    ON "BacktestTrialWorldRun" ("trialId", attempt);

CREATE TABLE IF NOT EXISTS "BacktestTrialInteraction" (
    id TEXT PRIMARY KEY,
    "worldRunId" TEXT NOT NULL REFERENCES "BacktestTrialWorldRun"(id) ON DELETE CASCADE,
    "trialId" TEXT NOT NULL REFERENCES "BacktestTrial"(id) ON DELETE CASCADE,
    ordinal INTEGER NOT NULL,
    kind TEXT NOT NULL,
    service TEXT NOT NULL,
    "methodPath" TEXT NOT NULL,
    "requestFingerprint" TEXT NOT NULL,
    "matchKind" TEXT NOT NULL,
    "statusCode" INTEGER,
    "durationMs" INTEGER,
    "payloadUri" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("worldRunId", ordinal)
);

CREATE INDEX IF NOT EXISTS "BacktestTrialInteraction_worldRunId_ordinal_idx"
    ON "BacktestTrialInteraction" ("worldRunId", ordinal);
CREATE INDEX IF NOT EXISTS "BacktestTrialInteraction_trialId_idx"
    ON "BacktestTrialInteraction" ("trialId");
