import type { EnvironmentType } from "@prisma/client";

export interface PermanentEnvConfig {
  name: string;
  type: EnvironmentType;
  gitBranch: string;
  flyAppName: string;
  flyAppUrl: string;
  vercelAlias: string | null;
  serviceSecret: string | null;
}

export function getPermanentEnvs(): PermanentEnvConfig[] {
  return [
    {
      name: "production",
      type: "PRODUCTION",
      gitBranch: "main",
      flyAppName: "chronicle-backend",
      flyAppUrl: "https://chronicle-backend.fly.dev",
      vercelAlias: process.env.VERCEL_PRODUCTION_URL ?? null,
      serviceSecret: process.env.SERVICE_SECRET_PRODUCTION ?? process.env.SERVICE_SECRET ?? null,
    },
    {
      name: "staging",
      type: "STAGING",
      gitBranch: "staging",
      flyAppName: "chronicle-backend-staging",
      flyAppUrl: "https://chronicle-backend-staging.fly.dev",
      vercelAlias: process.env.VERCEL_STAGING_URL ?? null,
      serviceSecret: process.env.SERVICE_SECRET_STAGING ?? null,
    },
    {
      name: "development",
      type: "DEVELOPMENT",
      gitBranch: "develop",
      flyAppName: "chronicle-backend-dev",
      flyAppUrl: "https://chronicle-backend-dev.fly.dev",
      vercelAlias: process.env.VERCEL_DEV_URL ?? null,
      serviceSecret: process.env.SERVICE_SECRET_DEV ?? null,
    },
  ];
}
