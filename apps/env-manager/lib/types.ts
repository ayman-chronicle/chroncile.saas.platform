export type EnvironmentType = "PRODUCTION" | "STAGING" | "DEVELOPMENT" | "EPHEMERAL";
export type EnvironmentStatus = "RUNNING" | "STOPPED" | "PROVISIONING" | "DESTROYING" | "ERROR";

export interface EnvironmentRecord {
  id: string;
  name: string;
  type: EnvironmentType;
  status: EnvironmentStatus;
  gitBranch: string | null;
  gitSha: string | null;
  gitTag: string | null;
  flyAppName: string | null;
  flyAppUrl: string | null;
  flyDbName: string | null;
  vercelUrl: string | null;
  vercelDeploymentId: string | null;
  vercelEnvVarId: string | null;
  isHealthy: boolean;
  lastHealthAt: string | null;
  serviceSecret: string | null;
  provisionLog: string | null;
  errorLog: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HealthCheckRecord {
  id: string;
  environmentId: string;
  backendStatus: number | null;
  frontendStatus: number | null;
  backendMs: number | null;
  frontendMs: number | null;
  gitSha: string | null;
  checkedAt: string;
}

export type StressTestStatus =
  | "queued"
  | "initializing"
  | "running"
  | "finished"
  | "aborted"
  | "error";

export interface StressTestConfig {
  vus: number;
  duration: string;
  rampUp: string;
  endpoints: string[];
}

export interface StressTestResultSummary {
  avgLatency?: number;
  p95?: number;
  p99?: number;
  rps?: number;
  errorRate?: number;
}

export interface StressTestRecord {
  id: string;
  environmentId: string;
  k6TestRunId: string | null;
  name: string;
  status: StressTestStatus;
  config: StressTestConfig;
  resultSummary: StressTestResultSummary | null;
  k6Url: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}
