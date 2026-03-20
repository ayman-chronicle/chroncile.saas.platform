import { auth } from "@/server/auth/auth";
import { fetchFromBackend } from "@/server/backend/fetch-from-backend";
import { redirect } from "next/navigation";
import type { NangoProviderSummary } from "platform-api";
import type { ConnectionListResponse } from "shared/generated";
import { ConnectionsClient } from "./connections-client";

export default async function ConnectionsPage() {
  const session = await auth();

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  let providers: NangoProviderSummary[] = [];
  let connections: ConnectionListResponse["connections"] = [];
  let initialLoadError: string | null = null;

  const [providersResult, connectionsResult] = await Promise.allSettled([
    fetchFromBackend<{ providers: NangoProviderSummary[] }>(
      "/api/platform/integrations/providers",
    ),
    fetchFromBackend<ConnectionListResponse>(
      "/api/platform/integrations/connections",
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

  return (
    <ConnectionsClient
      initialProviders={providers}
      initialConnections={connections}
      initialLoadError={initialLoadError}
    />
  );
}
