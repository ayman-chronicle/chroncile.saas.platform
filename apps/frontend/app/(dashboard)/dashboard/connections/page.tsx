import { auth } from "@/server/auth/auth";
import { fetchFromBackend } from "@/server/backend/fetch-from-backend";
import { redirect } from "next/navigation";
import type { NangoProviderSummary, TrellusIntegrationResponse } from "platform-api";
import type { ConnectionListResponse } from "shared/generated";
import { ConnectionsClient } from "./connections-client";

export default async function ConnectionsPage() {
  const session = await auth();

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  let providers: NangoProviderSummary[] = [];
  let connections: ConnectionListResponse["connections"] = [];
  let trellus: TrellusIntegrationResponse | null = null;
  let initialLoadError: string | null = null;

  const [providersResult, connectionsResult, trellusResult] = await Promise.allSettled([
    fetchFromBackend<{ providers: NangoProviderSummary[] }>(
      "/api/platform/integrations/providers",
    ),
    fetchFromBackend<ConnectionListResponse>(
      "/api/platform/integrations/connections",
    ),
    fetchFromBackend<TrellusIntegrationResponse>(
      "/api/platform/integrations/trellus",
    ),
  ]);

  if (providersResult.status === "fulfilled") {
    providers = providersResult.value.providers;
  } else {
    initialLoadError = "Failed to load integrations.";
  }

  if (connectionsResult.status === "fulfilled") {
    connections = connectionsResult.value.connections;
  } else if (providers.length > 0) {
    connections = providers.flatMap((provider) =>
      provider.connection ? [provider.connection] : [],
    );
  }

  if (trellusResult.status === "fulfilled") {
    trellus = trellusResult.value;
  } else {
    trellus = {
      provider: "trellus",
      displayName: "Trellus.ai",
      description: "Receive Trellus call events via direct webhook.",
      transport: "webhook",
      connection: null,
      webhookUrl: null,
      headerName: "x-chronicle-webhook-secret",
      headerValue: null,
      setupStatus: "not_configured",
      lastReceivedAt: null,
      eventCount: 0,
    };
  }

  return (
    <ConnectionsClient
      initialProviders={providers}
      initialConnections={connections}
      initialTrellus={trellus}
      initialLoadError={initialLoadError}
    />
  );
}
