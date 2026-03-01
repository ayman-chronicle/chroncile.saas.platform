const FLY_API_BASE = "https://api.machines.dev/v1";

function flyHeaders(): HeadersInit {
  const token = process.env.FLY_API_TOKEN;
  if (!token) throw new Error("FLY_API_TOKEN is not set");
  // Fly Machines API uses FlyV1 scheme; GraphQL API uses Bearer
  const scheme = token.startsWith("FlyV1 ") ? token : `FlyV1 ${token}`;
  return {
    Authorization: scheme,
    "Content-Type": "application/json",
  };
}

function bearerToken(): string {
  const token = process.env.FLY_API_TOKEN;
  if (!token) throw new Error("FLY_API_TOKEN is not set");
  // Strip FlyV1 prefix for GraphQL API which still uses Bearer
  return token.replace(/^FlyV1\s+/, "");
}

function orgSlug(): string {
  const slug = process.env.FLY_ORG_SLUG;
  if (!slug) throw new Error("FLY_ORG_SLUG is not set");
  return slug;
}

async function flyFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const res = await fetch(`${FLY_API_BASE}${path}`, {
    ...init,
    headers: { ...flyHeaders(), ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Fly API ${init?.method ?? "GET"} ${path} → ${res.status}: ${body}`);
  }
  return res;
}

async function safeJson<T>(res: Response): Promise<T | null> {
  const text = await res.text();
  if (!text || text.trim().length === 0) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export interface FlyApp {
  id: string;
  name: string;
  status: string;
}

export interface FlyMachine {
  id: string;
  name: string;
  state: string;
  region: string;
}

export async function createApp(name: string): Promise<FlyApp | null> {
  const res = await flyFetch("/apps", {
    method: "POST",
    body: JSON.stringify({ app_name: name, org_slug: orgSlug() }),
  });
  return safeJson<FlyApp>(res);
}

export async function getApp(name: string): Promise<FlyApp | null> {
  try {
    const res = await flyFetch(`/apps/${name}`);
    return safeJson<FlyApp>(res);
  } catch {
    return null;
  }
}

export async function deleteApp(name: string): Promise<void> {
  await flyFetch(`/apps/${name}`, { method: "DELETE" });
}

export async function listMachines(appName: string): Promise<FlyMachine[]> {
  const res = await flyFetch(`/apps/${appName}/machines`);
  return (await safeJson<FlyMachine[]>(res)) ?? [];
}

export async function createMachine(
  appName: string,
  config: {
    region: string;
    image: string;
    env?: Record<string, string>;
  }
): Promise<FlyMachine | null> {
  const { execFile } = await import("child_process");
  const { promisify } = await import("util");
  const exec = promisify(execFile);

  const envArgs: string[] = [];
  for (const [key, value] of Object.entries(config.env ?? {})) {
    envArgs.push("-e", `${key}=${value}`);
  }

  const { stdout } = await exec("flyctl", [
    "machine", "run",
    config.image,
    "-a", appName,
    "-r", config.region,
    "--vm-size", "shared-cpu-1x",
    "--vm-memory", "256",
    "-p", "443:8080/tcp:tls:http",
    "-p", "80:8080/tcp:http",
    "--restart", "always",
    "--autostart",
    ...envArgs,
  ], {
    env: { ...process.env },
    timeout: 120_000,
  });

  const idMatch = stdout.match(/Machine ID:\s*(\S+)/);
  const id = idMatch?.[1] ?? "unknown";
  return { id, name: appName, state: "created", region: config.region };
}

export async function allocatePublicIps(appName: string): Promise<void> {
  const { execFile } = await import("child_process");
  const { promisify } = await import("util");
  const exec = promisify(execFile);

  await Promise.allSettled([
    exec("flyctl", ["ips", "allocate-v4", "--shared", "-a", appName], {
      env: { ...process.env },
    }),
    exec("flyctl", ["ips", "allocate-v6", "-a", appName], {
      env: { ...process.env },
    }),
  ]);
}

export async function destroyMachine(
  appName: string,
  machineId: string,
  force = true
): Promise<void> {
  await flyFetch(
    `/apps/${appName}/machines/${machineId}?force=${force}`,
    { method: "DELETE" }
  );
}

export async function setSecrets(
  appName: string,
  secrets: Record<string, string>
): Promise<void> {
  const res = await fetch(`https://api.fly.io/graphql`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${bearerToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: `
        mutation($input: SetSecretsInput!) {
          setSecrets(input: $input) {
            app { name }
          }
        }
      `,
      variables: {
        input: {
          appId: appName,
          secrets: Object.entries(secrets).map(([key, value]) => ({
            key,
            value,
          })),
        },
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Fly GraphQL setSecrets → ${res.status}: ${body}`);
  }

  const gqlData = await safeJson<{ errors?: Array<{ message: string }> }>(res);
  if (gqlData?.errors?.length) {
    throw new Error(`Fly GraphQL setSecrets error: ${gqlData.errors[0].message}`);
  }
}

export async function createPostgresCluster(
  name: string,
  region = "ams"
): Promise<{ appName: string; connectionString: string }> {
  const { execFile } = await import("child_process");
  const { promisify } = await import("util");
  const exec = promisify(execFile);

  const token = process.env.FLY_API_TOKEN ?? "";

  try {
    const { stdout, stderr } = await exec("flyctl", [
      "postgres", "create",
      "--name", name,
      "--org", orgSlug(),
      "--region", region,
      "--vm-size", "shared-cpu-1x",
      "--volume-size", "1",
      "--initial-cluster-size", "1",
    ], {
      env: { ...process.env, FLY_API_TOKEN: token },
      timeout: 120_000,
    });

    const output = stdout + stderr;
    // flyctl prints: Username: postgres  Password: XXXX  Hostname: name.internal
    const passwordMatch = output.match(/Password:\s*(\S+)/);
    const password = passwordMatch?.[1] ?? "postgres";
    const connStr = `postgresql://postgres:${password}@${name}.internal:5432/postgres?sslmode=disable`;
    return { appName: name, connectionString: connStr };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`flyctl postgres create failed: ${message}`);
  }
}

export async function deletePostgresCluster(name: string): Promise<void> {
  await deleteApp(name);
}

export async function forkPostgresCluster(
  sourceName: string,
  destName: string,
  region = "ams"
): Promise<{ appName: string; connectionString: string }> {
  const { execFile } = await import("child_process");
  const { promisify } = await import("util");
  const exec = promisify(execFile);

  try {
    const { stdout, stderr } = await exec("flyctl", [
      "postgres", "fork",
      "--from", sourceName,
      "--name", destName,
      "--org", orgSlug(),
      "--region", region,
    ], {
      env: { ...process.env },
      timeout: 180_000,
    });

    const output = stdout + stderr;
    const passwordMatch = output.match(/Password:\s*(\S+)/);
    const password = passwordMatch?.[1] ?? "postgres";
    const connStr = `postgresql://postgres:${password}@${destName}.internal:5432/postgres?sslmode=disable`;
    return { appName: destName, connectionString: connStr };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`flyctl postgres fork failed: ${message}`);
  }
}

export async function runSeedSql(
  dbAppName: string,
  seedSqlUrl: string
): Promise<void> {
  const { execFile, spawn } = await import("child_process");
  const { promisify } = await import("util");
  const exec = promisify(execFile);

  const res = await fetch(seedSqlUrl, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Failed to download seed SQL from ${seedSqlUrl}: ${res.status}`);
  const sql = await res.text();

  // Get the Postgres operator password from the DB machine
  const { stdout: pwOut } = await exec("flyctl", [
    "ssh", "console", "-a", dbAppName,
    "-C", "printenv OPERATOR_PASSWORD",
  ], { env: { ...process.env }, timeout: 30_000 });
  const password = pwOut.trim();
  if (!password) throw new Error("Could not retrieve OPERATOR_PASSWORD from DB machine");

  // Start a local proxy to the Fly Postgres
  const proxyPort = 10000 + Math.floor(Math.random() * 50000);
  const proxy = spawn("flyctl", [
    "proxy", `${proxyPort}:5433`, "-a", dbAppName,
  ], { env: { ...process.env }, stdio: "pipe" });

  // Wait for proxy to be ready
  await new Promise<void>((resolve, reject) => {
    let started = false;
    const onData = (chunk: Buffer) => {
      if (!started && chunk.toString().includes("Proxying")) {
        started = true;
        resolve();
      }
    };
    proxy.stdout?.on("data", onData);
    proxy.stderr?.on("data", onData);
    proxy.on("error", reject);
    setTimeout(() => { if (!started) { started = true; resolve(); } }, 5_000);
  });

  try {
    // Connect via pg and execute the seed SQL
    const { default: pg } = await import("pg");
    const client = new pg.Client({
      host: "127.0.0.1",
      port: proxyPort,
      user: "postgres",
      password,
      database: "postgres",
      connectionTimeoutMillis: 15_000,
      statement_timeout: 60_000,
    });

    await client.connect();
    try {
      await client.query(sql);
    } finally {
      await client.end();
    }
  } finally {
    proxy.kill();
  }
}

export async function waitForHealthy(
  appUrl: string,
  timeoutMs = 120_000,
  intervalMs = 5_000
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${appUrl}/health`, {
        signal: AbortSignal.timeout(5_000),
      });
      if (res.ok) return true;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}
