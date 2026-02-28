import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

const HEADERS_TO_FORWARD = ["content-type", "x-pd-deployment-id", "x-pd-emitter-id"];

async function proxyWebhook(
  request: NextRequest,
  method: string,
): Promise<NextResponse> {
  const body = await request.text();
  const headers: Record<string, string> = {};

  for (const key of HEADERS_TO_FORWARD) {
    const val = request.headers.get(key);
    if (val) headers[key] = val;
  }
  if (!headers["content-type"]) {
    headers["content-type"] = "application/json";
  }

  const res = await fetch(
    `${BACKEND_URL}/api/platform/pipedream/auth-webhook`,
    { method, headers, body: body || undefined },
  );

  const responseBody = await res.text();
  return new NextResponse(responseBody || null, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(request: NextRequest) {
  return proxyWebhook(request, "POST");
}
