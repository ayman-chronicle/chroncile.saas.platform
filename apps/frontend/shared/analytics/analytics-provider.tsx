"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";

import { useAuthSession, type AuthSession } from "@/shared/auth/auth-session-provider";
import { getAnalyticsClient, noopAnalyticsClient } from "./client";
import type { AnalyticsClient, AnalyticsProperties } from "./types";

const AnalyticsContext = createContext<AnalyticsClient>(noopAnalyticsClient);

function getIdentity(session: AuthSession | null) {
  if (!session) return null;

  const fullName = [session.user.firstName, session.user.lastName]
    .filter((part): part is string => Boolean(part && part.length > 0))
    .join(" ");

  return {
    id: session.user.id,
    email: session.user.email,
    name: fullName || undefined,
    role: session.role ?? undefined,
    tenantId: session.organizationId ?? undefined,
  };
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const analytics = useMemo(() => getAnalyticsClient(), []);
  const { session } = useAuthSession();
  const lastIdentityRef = useRef<string | null>(null);

  useEffect(() => {
    const identity = getIdentity(session);
    const identityKey = identity ? JSON.stringify(identity) : null;

    if (!identity) {
      if (lastIdentityRef.current !== null) {
        analytics.reset();
        lastIdentityRef.current = null;
      }
      return;
    }

    if (lastIdentityRef.current === identityKey) {
      return;
    }

    analytics.identify(identity.id, identity);
    lastIdentityRef.current = identityKey;
  }, [analytics, session]);

  return (
    <AnalyticsContext.Provider value={analytics}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics(): AnalyticsClient {
  return useContext(AnalyticsContext);
}

export function useTrack() {
  const analytics = useAnalytics();

  return useCallback(
    (event: string, properties?: AnalyticsProperties) => {
      analytics.track(event, properties);
    },
    [analytics],
  );
}
