import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const FLY_API_BASE = "https://api.machines.dev/v1";

function flyV1Header() {
  const token = process.env.FLY_API_TOKEN ?? "";
  return `FlyV1 ${token.replace(/^FlyV1\s+/, "")}`;
}

async function flyFetch(path: string) {
  const res = await fetch(`${FLY_API_BASE}${path}`, {
    headers: { Authorization: flyV1Header() },
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) return null;
  const text = await res.text();
  if (!text.trim()) return null;
  try { return JSON.parse(text); } catch { return null; }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const env = await prisma.environment.findUnique({ where: { id } });
  if (!env) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const resources: {
    machines: unknown[];
    volumes: unknown[];
    ips: unknown[];
    postgres: { name: string; url: string } | null;
    errors: string[];
  } = { machines: [], volumes: [], ips: [], postgres: null, errors: [] };

  if (!env.flyAppName) return NextResponse.json(resources);

  const [machines, volumes, ips] = await Promise.all([
    flyFetch(`/apps/${env.flyAppName}/machines`).catch(() => null),
    flyFetch(`/apps/${env.flyAppName}/volumes`).catch(() => null),
    fetch(`https://api.fly.io/graphql`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${(process.env.FLY_API_TOKEN ?? "").replace(/^FlyV1\s+/, "")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `query($name: String!) { app(name: $name) { ipAddresses { nodes { address type region createdAt } } } }`,
        variables: { name: env.flyAppName },
      }),
      signal: AbortSignal.timeout(8_000),
    }).then(r => r.json()).then(d => d?.data?.app?.ipAddresses?.nodes ?? []).catch(() => []),
  ]);

  resources.machines = (machines ?? []).map((m: Record<string, unknown>) => ({
    id: m.id,
    name: m.name,
    state: m.state,
    region: m.region,
    imageRef: (m.config as Record<string, unknown>)?.image ?? null,
    cpus: ((m.config as Record<string, unknown>)?.guest as Record<string, unknown>)?.cpus ?? null,
    memoryMb: ((m.config as Record<string, unknown>)?.guest as Record<string, unknown>)?.memory_mb ?? null,
    updatedAt: m.updated_at,
  }));

  resources.volumes = (volumes ?? []).map((v: Record<string, unknown>) => ({
    id: v.id,
    name: v.name,
    state: v.state,
    sizeGb: v.size_gb,
    region: v.region,
    encrypted: v.encrypted,
    createdAt: v.created_at,
  }));

  resources.ips = ips;

  if (env.flyDbName) {
    resources.postgres = {
      name: env.flyDbName,
      url: `https://fly.io/apps/${env.flyDbName}`,
    };
  }

  return NextResponse.json(resources);
}
