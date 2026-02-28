import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";

export async function POST(req: NextRequest) {
  // TODO: Implement process-pending in Rust backend
  // For now, return a stub response
  return NextResponse.json({ processed: 0, message: "No pending runs" });
}
