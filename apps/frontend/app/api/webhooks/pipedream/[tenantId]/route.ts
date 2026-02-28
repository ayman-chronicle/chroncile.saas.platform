import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const { tenantId } = await params;
  const body = await request.text();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  for (const key of ["x-pd-deployment-id", "x-pd-emitter-id"]) {
    const val = request.headers.get(key);
    if (val) headers[key] = val;
  }

  const res = await fetch(
    `${BACKEND_URL}/api/webhooks/pipedream/${tenantId}`,
    { method: "POST", headers, body },
  );

  const responseBody = await res.text();
  return new NextResponse(responseBody || null, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
