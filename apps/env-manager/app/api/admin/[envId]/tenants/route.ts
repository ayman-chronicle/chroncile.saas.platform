import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { backendFetch } from "@/lib/backend-client";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ envId: string }> }
) {
  const { envId } = await params;
  const env = await prisma.environment.findUnique({ where: { id: envId } });
  if (!env?.flyAppUrl) {
    return NextResponse.json({ error: "Environment not found or has no backend" }, { status: 404 });
  }

  try {
    const res = await backendFetch(env.flyAppUrl, "/api/platform/admin/tenants");
    if (!res.ok) {
      return NextResponse.json({ tenants: [], total: 0, error: `Backend ${res.status}` });
    }
    return NextResponse.json(await res.json());
  } catch (err) {
    return NextResponse.json({ tenants: [], total: 0, error: String(err) });
  }
}
