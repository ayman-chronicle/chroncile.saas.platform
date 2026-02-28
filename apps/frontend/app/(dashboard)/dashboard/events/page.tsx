import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { fetchFromBackend } from "@/lib/backend";
import { EventsClient } from "./events-client";

interface ConnectionSummary {
  provider: string;
  status: string;
}

export default async function EventsPage() {
  const session = await auth();

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  let hasActiveIntercom = false;
  try {
    const data = await fetchFromBackend<{ connections: ConnectionSummary[] }>(
      "/api/platform/connections",
    );
    hasActiveIntercom = data.connections.some(
      (c) => c.provider === "intercom" && c.status === "active",
    );
  } catch {
    // Backend unavailable
  }

  return (
    <EventsClient
      tenantId={session.user.tenantId}
      eventsManagerUrl={process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080"}
      hasActiveIntercom={hasActiveIntercom}
    />
  );
}
