import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { backendFetch } from "@/lib/backend-client";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ envId: string; tenantId: string }> }
) {
  const { envId, tenantId } = await params;
  const env = await prisma.environment.findUnique({ where: { id: envId } });
  if (!env?.flyAppUrl) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const res = await backendFetch(
      env.flyAppUrl,
      `/api/platform/admin/tenants/${tenantId}/invite`,
      { method: "POST", body: JSON.stringify(body) },
      env.serviceSecret
    );
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data.error ?? "Invite failed" }, { status: res.status });
    }
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
