-- CreateEnum
CREATE TYPE "EnvironmentType" AS ENUM ('PRODUCTION', 'STAGING', 'DEVELOPMENT', 'EPHEMERAL');

-- CreateEnum
CREATE TYPE "EnvironmentStatus" AS ENUM ('RUNNING', 'STOPPED', 'PROVISIONING', 'DESTROYING', 'ERROR');

-- CreateEnum
CREATE TYPE "DbTemplateMode" AS ENUM ('FLY_DB', 'ENVIRONMENT', 'SEED_ONLY');

-- CreateTable
CREATE TABLE "Environment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "EnvironmentType" NOT NULL,
    "status" "EnvironmentStatus" NOT NULL DEFAULT 'PROVISIONING',
    "gitBranch" TEXT,
    "gitSha" TEXT,
    "gitTag" TEXT,
    "flyAppName" TEXT,
    "flyAppUrl" TEXT,
    "flyDbName" TEXT,
    "vercelUrl" TEXT,
    "vercelDeploymentId" TEXT,
    "vercelEnvVarId" TEXT,
    "isHealthy" BOOLEAN NOT NULL DEFAULT false,
    "lastHealthAt" TIMESTAMP(3),
    "serviceSecret" TEXT,
    "dbTemplateId" TEXT,
    "provisionLog" TEXT,
    "errorLog" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Environment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthCheck" (
    "id" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "backendStatus" INTEGER,
    "frontendStatus" INTEGER,
    "backendMs" INTEGER,
    "frontendMs" INTEGER,
    "gitSha" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StressTest" (
    "id" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "k6TestRunId" TEXT,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "config" JSONB NOT NULL,
    "resultSummary" JSONB,
    "k6Url" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StressTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DbTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "mode" "DbTemplateMode" NOT NULL,
    "flyDbName" TEXT,
    "sourceEnvId" TEXT,
    "seedSqlUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "DbTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Environment_name_key" ON "Environment"("name");

-- CreateIndex
CREATE INDEX "Environment_type_idx" ON "Environment"("type");

-- CreateIndex
CREATE INDEX "Environment_status_idx" ON "Environment"("status");

-- CreateIndex
CREATE INDEX "HealthCheck_environmentId_checkedAt_idx" ON "HealthCheck"("environmentId", "checkedAt");

-- CreateIndex
CREATE INDEX "StressTest_environmentId_createdAt_idx" ON "StressTest"("environmentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DbTemplate_name_key" ON "DbTemplate"("name");

-- AddForeignKey
ALTER TABLE "HealthCheck" ADD CONSTRAINT "HealthCheck_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StressTest" ADD CONSTRAINT "StressTest_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
