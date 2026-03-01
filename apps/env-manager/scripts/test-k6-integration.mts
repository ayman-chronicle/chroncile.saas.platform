#!/usr/bin/env node
/**
 * Local integration test for k6 Cloud load-test feature.
 *
 * Tests:
 *   1-5.  Script builder, stage generation, status helpers, load zones (pure logic)
 *   6-9.  Zod request validation (same schema the API route uses)
 *   10.   k6 Cloud API connectivity (requires env vars, skip with --skip-api)
 *
 * Usage:  npx tsx scripts/test-k6-integration.mts
 *         npx tsx scripts/test-k6-integration.mts --skip-api
 */
import { config } from "dotenv";
import { resolve } from "path";
import { z } from "zod";

config({ path: resolve(process.cwd(), ".env") });

// ── Helpers ──────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const skipApi = process.argv.includes("--skip-api");

function pass(msg: string) { console.log(`  ✅  ${msg}`); passed++; }
function fail(msg: string) { console.log(`  ❌  ${msg}`); failed++; }
function info(msg: string) { console.log(`  ℹ️   ${msg}`); }
function section(msg: string) { console.log(`\n━━━ ${msg} ━━━`); }

function assert(condition: boolean, msg: string) {
  if (condition) pass(msg);
  else fail(msg);
}

// ── Inline the pure functions from k6-client.ts ──────────────────────────────
// (Scripts in this repo are self-contained; they don't import from lib/)

type K6RunStatus =
  | "created" | "queued" | "initializing"
  | "running" | "processing_metrics"
  | "completed" | "aborted";

interface LoadTestConfig {
  vus: number;
  duration: string;
  rampUp: string;
  endpoints: string[];
}

const LOAD_ZONE_MAP: Record<string, string> = {
  "us-east": "amazon:us:ashburn",
  "us-west": "amazon:us:portland",
  "eu-west": "amazon:ie:dublin",
  "eu-central": "amazon:de:frankfurt",
  "ap-southeast": "amazon:sg:singapore",
  "ap-northeast": "amazon:jp:tokyo",
};

function resolveLoadZone(region: string): string {
  return LOAD_ZONE_MAP[region] ?? LOAD_ZONE_MAP["us-east"]!;
}

function isTerminalStatus(status: K6RunStatus): boolean {
  return status === "completed" || status === "aborted";
}

function isActiveStatus(status: K6RunStatus): boolean {
  return (
    status === "created" ||
    status === "queued" ||
    status === "initializing" ||
    status === "running" ||
    status === "processing_metrics"
  );
}

function parseDurationSeconds(d: string): number {
  const match = d.match(/^(\d+)(s|m|h)$/);
  if (!match) return 60;
  const value = Number(match[1]);
  switch (match[2]) {
    case "s": return value;
    case "m": return value * 60;
    case "h": return value * 3600;
    default:  return 60;
  }
}

function buildStages(cfg: LoadTestConfig): Array<{ duration: string; target: number }> {
  const stages: Array<{ duration: string; target: number }> = [];
  if (cfg.rampUp && cfg.rampUp !== "none" && cfg.rampUp !== "0s") {
    stages.push({ duration: cfg.rampUp, target: cfg.vus });
  }
  stages.push({ duration: cfg.duration, target: cfg.vus });
  const rampDownSeconds = Math.max(10, Math.floor(parseDurationSeconds(cfg.duration) * 0.1));
  stages.push({ duration: `${rampDownSeconds}s`, target: 0 });
  return stages;
}

function buildK6Script(
  backendUrl: string,
  frontendUrl: string | null,
  cfg: LoadTestConfig,
  projectId: number,
  testName: string
): string {
  const stages = buildStages(cfg);
  const endpoints = cfg.endpoints.map((ep) =>
    ep.startsWith("http") ? ep : `${backendUrl}${ep}`
  );
  const httpCalls = endpoints
    .map((url) => `  responses.push(http.get(${JSON.stringify(url)}));`)
    .join("\n");

  if (frontendUrl) endpoints.push(frontendUrl);

  return `import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: ${JSON.stringify(stages, null, 4)},
  thresholds: {
    http_req_duration: ["p(95)<2000"],
    http_req_failed: ["rate<0.1"],
  },
  cloud: {
    projectID: ${projectId},
    name: ${JSON.stringify(testName)},
  },
};

export default function () {
  const responses = [];
${httpCalls}
${frontendUrl ? `  responses.push(http.get(${JSON.stringify(frontendUrl)}));` : ""}

  for (const res of responses) {
    check(res, {
      "status is 2xx": (r) => r.status >= 200 && r.status < 300,
      "response time < 2s": (r) => r.timings.duration < 2000,
    });
  }
  sleep(1);
}
`;
}

// Zod schema (exact copy from the API route)
const CreateSchema = z.object({
  name: z.string().min(1).max(200),
  vus: z.number().int().min(1).max(1000),
  duration: z.string().regex(/^\d+(s|m|h)$/),
  rampUp: z.string().regex(/^(none|\d+(s|m))$/),
  endpoints: z.array(z.string().min(1)).min(1),
});

// ── 1. Script Builder — basic output ─────────────────────────────────────────

section("1. Script builder — basic output");
{
  const script = buildK6Script(
    "https://backend.fly.dev",
    "https://frontend.vercel.app",
    { vus: 100, duration: "1m", rampUp: "30s", endpoints: ["/health", "/api/platform/dashboard/stats"] },
    12345,
    "Test Run"
  );

  assert(script.includes('import http from "k6/http"'), "Has k6/http import");
  assert(script.includes('import { check, sleep } from "k6"'), "Has check/sleep import");
  assert(script.includes("projectID: 12345"), "Has correct projectID");
  assert(script.includes('"Test Run"'), "Has correct test name");
  assert(script.includes("https://backend.fly.dev/health"), "Resolves /health to backend URL");
  assert(script.includes("https://backend.fly.dev/api/platform/dashboard/stats"), "Resolves stats endpoint");
  assert(script.includes("https://frontend.vercel.app"), "Includes frontend URL");
  assert(script.includes("http_req_duration"), "Has latency threshold");
  assert(script.includes("http_req_failed"), "Has error rate threshold");
  assert(script.includes("sleep(1)"), "Has sleep between iterations");
}

// ── 2. Script builder — no frontend URL ──────────────────────────────────────

section("2. Script builder — no frontend URL");
{
  const script = buildK6Script(
    "https://backend.fly.dev",
    null,
    { vus: 50, duration: "30s", rampUp: "none", endpoints: ["/health"] },
    999,
    "No Frontend"
  );

  assert(!script.includes("null"), "Does not contain literal 'null'");
  assert(script.includes("https://backend.fly.dev/health"), "Has backend health endpoint");
  const frontendLine = script
    .split("\n")
    .find((l) => l.includes("responses.push") && l.includes("vercel"));
  assert(!frontendLine, "No frontend fetch call when frontendUrl is null");
}

// ── 3. Script builder — absolute URL passthrough ─────────────────────────────

section("3. Script builder — absolute URL passthrough");
{
  const script = buildK6Script(
    "https://backend.fly.dev",
    null,
    { vus: 10, duration: "30s", rampUp: "none", endpoints: ["https://custom.api.com/test"] },
    1,
    "Absolute URL"
  );

  assert(script.includes("https://custom.api.com/test"), "Absolute URL passed through");
  assert(!script.includes("https://backend.fly.devhttps://"), "Does not double-prefix absolute URLs");
}

// ── 4. Stage generation — with ramp-up ───────────────────────────────────────

section("4. Stage generation — with ramp-up");
{
  const script = buildK6Script(
    "https://b.fly.dev", null,
    { vus: 200, duration: "5m", rampUp: "1m", endpoints: ["/health"] },
    1, "Stages"
  );

  const stagesMatch = script.match(/stages:\s*(\[[\s\S]*?\])/);
  assert(!!stagesMatch, "Script contains stages array");

  if (stagesMatch) {
    const stages = JSON.parse(stagesMatch[1]) as Array<{ duration: string; target: number }>;
    assert(stages.length === 3, `3 stages (ramp + sustain + ramp-down), got ${stages.length}`);
    assert(stages[0].duration === "1m" && stages[0].target === 200, "Ramp-up: 1m → 200 VUs");
    assert(stages[1].duration === "5m" && stages[1].target === 200, "Sustain: 5m at 200 VUs");
    assert(stages[2].target === 0, "Ramp-down targets 0 VUs");
    const rampDownSec = parseInt(stages[2].duration);
    assert(rampDownSec === 30, `Ramp-down is 10% of 5m = 30s, got ${rampDownSec}s`);
  }
}

// ── 5. Stage generation — no ramp-up ─────────────────────────────────────────

section("5. Stage generation — no ramp-up");
{
  const script = buildK6Script(
    "https://b.fly.dev", null,
    { vus: 50, duration: "30s", rampUp: "none", endpoints: ["/health"] },
    1, "No Ramp"
  );

  const stagesMatch = script.match(/stages:\s*(\[[\s\S]*?\])/);
  assert(!!stagesMatch, "Script contains stages array");

  if (stagesMatch) {
    const stages = JSON.parse(stagesMatch[1]) as Array<{ duration: string; target: number }>;
    assert(stages.length === 2, `2 stages (sustain + ramp-down) when rampUp=none, got ${stages.length}`);
    assert(stages[0].duration === "30s" && stages[0].target === 50, "Sustain: 30s at 50 VUs");
    assert(stages[1].target === 0, "Ramp-down targets 0");
    const rampDownSec = parseInt(stages[1].duration);
    assert(rampDownSec === 10, `Ramp-down min is 10s for short durations, got ${rampDownSec}s`);
  }
}

// ── 6. Status helpers ────────────────────────────────────────────────────────

section("6. Status helper functions");
{
  const active: K6RunStatus[] = ["created", "queued", "initializing", "running", "processing_metrics"];
  const terminal: K6RunStatus[] = ["completed", "aborted"];

  for (const s of active) {
    assert(isActiveStatus(s), `isActiveStatus("${s}") === true`);
    assert(!isTerminalStatus(s), `isTerminalStatus("${s}") === false`);
  }
  for (const s of terminal) {
    assert(isTerminalStatus(s), `isTerminalStatus("${s}") === true`);
    assert(!isActiveStatus(s), `isActiveStatus("${s}") === false`);
  }
}

// ── 7. Load zone resolution ──────────────────────────────────────────────────

section("7. Load zone resolution");
{
  assert(resolveLoadZone("us-east") === "amazon:us:ashburn", "us-east → amazon:us:ashburn");
  assert(resolveLoadZone("eu-central") === "amazon:de:frankfurt", "eu-central → amazon:de:frankfurt");
  assert(resolveLoadZone("unknown-region") === "amazon:us:ashburn", "Unknown region falls back to us-east");
}

// ── 8. Zod validation — valid payloads ───────────────────────────────────────

section("8. Zod request validation — valid payloads");
{
  const valid = [
    { name: "Basic test", vus: 50, duration: "1m", rampUp: "30s", endpoints: ["/health"] },
    { name: "Max VUs", vus: 1000, duration: "10m", rampUp: "none", endpoints: ["/health", "/api/test"] },
    { name: "Seconds only", vus: 1, duration: "30s", rampUp: "10s", endpoints: ["/health"] },
    { name: "Hours", vus: 100, duration: "1h", rampUp: "1m", endpoints: ["/health"] },
  ];

  for (const payload of valid) {
    const result = CreateSchema.safeParse(payload);
    assert(result.success, `Accepted: ${payload.name} (${payload.vus} VUs, ${payload.duration})`);
  }
}

// ── 9. Zod validation — invalid payloads ─────────────────────────────────────

section("9. Zod request validation — invalid payloads");
{
  const invalid: Array<{ label: string; payload: unknown }> = [
    { label: "Empty name",         payload: { name: "", vus: 50, duration: "1m", rampUp: "30s", endpoints: ["/health"] } },
    { label: "VUs too high",       payload: { name: "t", vus: 5000, duration: "1m", rampUp: "30s", endpoints: ["/health"] } },
    { label: "VUs zero",           payload: { name: "t", vus: 0, duration: "1m", rampUp: "30s", endpoints: ["/health"] } },
    { label: "VUs float",          payload: { name: "t", vus: 50.5, duration: "1m", rampUp: "30s", endpoints: ["/health"] } },
    { label: "Bad duration 1x",    payload: { name: "t", vus: 50, duration: "1x", rampUp: "30s", endpoints: ["/health"] } },
    { label: "Bad rampUp 'fast'",  payload: { name: "t", vus: 50, duration: "1m", rampUp: "fast", endpoints: ["/health"] } },
    { label: "Empty endpoints []", payload: { name: "t", vus: 50, duration: "1m", rampUp: "none", endpoints: [] } },
    { label: "Missing endpoints",  payload: { name: "t", vus: 50, duration: "1m", rampUp: "none" } },
    { label: "Missing name",       payload: { vus: 50, duration: "1m", rampUp: "30s", endpoints: ["/health"] } },
  ];

  for (const { label, payload } of invalid) {
    const result = CreateSchema.safeParse(payload);
    assert(!result.success, `Rejected: ${label}`);
  }
}

// ── 10. k6 Cloud API connectivity ────────────────────────────────────────────

section("10. k6 Cloud API connectivity");

if (skipApi) {
  info("Skipped (--skip-api flag)");
} else {
  const apiToken = process.env.K6_CLOUD_API_TOKEN;
  const stackId = process.env.K6_CLOUD_STACK_ID;
  const projectId = process.env.K6_CLOUD_PROJECT_ID;

  if (!apiToken || !stackId || !projectId) {
    info("K6_CLOUD_API_TOKEN / K6_CLOUD_STACK_ID / K6_CLOUD_PROJECT_ID not set — skipping");
    info("Set them in .env to run connectivity tests");
  } else {
    // 10a. Auth — list load tests
    try {
      const res = await fetch("https://api.k6.io/cloud/v6/load_tests?$top=1", {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "X-Stack-Id": stackId,
        },
      });
      if (res.ok) {
        const data = await res.json();
        pass(`Auth OK — listed load tests (HTTP ${res.status})`);
        info(`Tests found: ${data["@count"] ?? data.value?.length ?? "unknown"}`);
      } else if (res.status === 401) {
        fail("Auth failed (401) — check K6_CLOUD_API_TOKEN");
        info(`Body: ${(await res.text().catch(() => "")).slice(0, 200)}`);
      } else if (res.status === 403) {
        fail("Forbidden (403) — service account may lack k6 permissions");
        info(`Body: ${(await res.text().catch(() => "")).slice(0, 200)}`);
      } else {
        fail(`Unexpected: HTTP ${res.status}`);
        info(`Body: ${(await res.text().catch(() => "")).slice(0, 200)}`);
      }
    } catch (e) {
      fail(`API request failed: ${e}`);
    }

    // 10b. Test runs endpoint
    try {
      const res = await fetch("https://api.k6.io/cloud/v6/test_runs?$top=1", {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "X-Stack-Id": stackId,
        },
      });
      if (res.ok) {
        pass(`Test runs endpoint reachable (HTTP ${res.status})`);
      } else {
        fail(`Test runs endpoint returned HTTP ${res.status}`);
        info(`Body: ${(await res.text().catch(() => "")).slice(0, 200)}`);
      }
    } catch (e) {
      fail(`Test runs request failed: ${e}`);
    }
  }
}

// ── Result ───────────────────────────────────────────────────────────────────
console.log(`\n${"─".repeat(50)}`);
if (failed === 0) {
  console.log(`\n  🟢  ALL CHECKS PASSED (${passed}/${passed + failed})\n`);
  process.exit(0);
} else {
  console.log(`\n  🔴  ${failed} CHECK(S) FAILED out of ${passed + failed}\n`);
  process.exit(1);
}
