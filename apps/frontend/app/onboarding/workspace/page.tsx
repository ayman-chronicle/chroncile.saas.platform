/**
 * /onboarding/workspace — first-time workspace setup.
 *
 * Server component: checks the session, redirects unauthenticated users to
 * /login, and skips the page entirely for users who already have an org.
 *
 * The actual UI is rendered by <WorkspaceSetupClient/>, which uses the
 * `WorkspaceSetup` composite Ayman built in packages/ui/src/auth.
 */

import { redirect } from "next/navigation";

import { getSession } from "@/server/auth/session";

import { WorkspaceSetupClient } from "./workspace-setup-client";

export const dynamic = "force-dynamic";

export default async function OnboardingWorkspacePage() {
  const session = await getSession();

  if (!session.authenticated) {
    redirect("/login?from=/onboarding/workspace");
  }

  if (session.organizationId) {
    // Already has an org — they shouldn't be on this page.
    redirect("/dashboard");
  }

  return (
    <WorkspaceSetupClient
      email={session.user.email}
      firstName={session.user.firstName ?? undefined}
    />
  );
}
