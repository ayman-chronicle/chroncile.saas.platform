import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { backendFetch } from "@/lib/backend-client";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ envId: string; tenantId: string }> }
) {
  const { envId, tenantId } = await params;
  const env = await prisma.environment.findUnique({ where: { id: envId } });
  if (!env?.flyAppUrl) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const res = await backendFetch(env.flyAppUrl, `/api/platform/admin/tenants/${tenantId}/users`);
    if (!res.ok) return NextResponse.json({ users: [] });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ users: [] });
  }
}
