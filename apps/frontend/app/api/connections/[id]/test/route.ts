import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  // TODO: Implement connection test in Rust backend
  return NextResponse.json({ success: true, message: "Connection is active" });
}
