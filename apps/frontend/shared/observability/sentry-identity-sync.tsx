"use client";

import type { Session } from "next-auth";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { syncSentryIdentity } from "./sentry-client";

function buildSentryIdentity(user?: Session["user"]) {
  if (!user) {
    return null;
  }

  return {
    email: user.email ?? undefined,
    id: user.id,
    name: user.name ?? undefined,
    role: user.role,
    tenantId: user.tenantId,
    tenantName: user.tenantName,
    tenantSlug: user.tenantSlug,
  };
}

export function SentryIdentitySync() {
  const { data: session } = useSession();

  useEffect(() => {
    syncSentryIdentity(buildSentryIdentity(session?.user));
  }, [session?.user]);

  return null;
}
