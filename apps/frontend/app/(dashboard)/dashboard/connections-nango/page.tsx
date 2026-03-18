import Link from "next/link";
import { redirect } from "next/navigation";
import type { NangoProviderSummary } from "platform-api";
import { auth } from "@/server/auth/auth";
import { fetchFromBackend } from "@/server/backend/fetch-from-backend";
import { ConnectionsNangoClient } from "./connections-nango-client";

export default async function ConnectionsNangoPage() {
  const session = await auth();

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  let providers: NangoProviderSummary[] = [];
  try {
    const data = await fetchFromBackend<{ providers: NangoProviderSummary[] }>(
      "/api/platform/integrations/providers",
    );
    providers = data.providers;
  } catch {
    providers = [];
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-primary">Nango Connections</h1>
          <p className="text-sm text-secondary">
            Phase 1 prototype for Intercom and Front on Nango.
          </p>
        </div>
        <Link
          href="/dashboard/connections"
          className="inline-flex items-center rounded-sm border border-border-dim px-3 py-2 text-sm text-secondary transition hover:bg-hover hover:text-primary"
        >
          Open Pipedream Page
        </Link>
      </div>

      <ConnectionsNangoClient initialProviders={providers} />
    </div>
  );
}
