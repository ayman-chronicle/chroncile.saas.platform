import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ deploymentId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { deploymentId } = await params;
  return proxyToBackend(request, `/api/platform/pipedream/triggers/deployed/${deploymentId}`);
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { deploymentId } = await params;
  return proxyToBackend(request, `/api/platform/pipedream/triggers/deployed/${deploymentId}`);
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { deploymentId } = await params;
  return proxyToBackend(request, `/api/platform/pipedream/triggers/deployed/${deploymentId}`);
}
