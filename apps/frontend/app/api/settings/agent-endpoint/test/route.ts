import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // TODO: Implement agent endpoint test in Rust backend
  return NextResponse.json({ success: true, message: "Endpoint reachable" });
}
