"use client";

import { SessionProvider } from "next-auth/react";
import { AnalyticsProvider } from "@/shared/analytics";
import { DeveloperWidget } from "@/shared/developer-tools/developer-widget";
import { SentryIdentitySync } from "@/shared/observability/sentry-identity-sync";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AnalyticsProvider>
        <SentryIdentitySync />
        {children}
        <DeveloperWidget />
      </AnalyticsProvider>
    </SessionProvider>
  );
}
