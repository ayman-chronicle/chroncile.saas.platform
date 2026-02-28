import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  for (const key of ["x-pd-deployment-id", "x-pd-emitter-id"]) {
    const val = request.headers.get(key);
    if (val) headers[key] = val;
  }

  const url = new URL("/api/webhooks/pipedream", BACKEND_URL);
  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  const res = await fetch(url.toString(), { method: "POST", headers, body });
  const responseBody = await res.text();
  return new NextResponse(responseBody || null, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}

export async function GET(request: NextRequest) {
  const challenge = request.nextUrl.searchParams.get("challenge");
  if (challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return NextResponse.json({
    status: "ok",
    endpoint: "Pipedream webhook receiver",
    timestamp: new Date().toISOString(),
  });
}
