"use client";

import { useEffect } from "react";

import { useAuthSession, type AuthSession } from "@/shared/auth/auth-session-provider";
import { syncSentryIdentity } from "./sentry-client";

function buildSentryIdentity(session: AuthSession | null) {
  if (!session) return null;

  const fullName = [session.user.firstName, session.user.lastName]
    .filter((part): part is string => Boolean(part && part.length > 0))
    .join(" ");

  return {
    id: session.user.id,
    email: session.user.email || undefined,
    name: fullName || undefined,
    role: session.role ?? undefined,
    tenantId: session.organizationId ?? undefined,
  };
}

export function SentryIdentitySync() {
  const { session } = useAuthSession();

  useEffect(() => {
    syncSentryIdentity(buildSentryIdentity(session));
  }, [session]);

  return null;
}
