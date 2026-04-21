"use client";

import { useRouter } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import { UIProviders } from "ui";
import { AnalyticsProvider } from "@/shared/analytics";
import { DeveloperWidget } from "@/shared/developer-tools/developer-widget";
import { SentryIdentitySync } from "@/shared/observability/sentry-identity-sync";

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <UIProviders navigate={(href) => router.push(href)}>
      <SessionProvider>
        <AnalyticsProvider>
          <SentryIdentitySync />
          {children}
          <DeveloperWidget />
        </AnalyticsProvider>
      </SessionProvider>
    </UIProviders>
  );
}
