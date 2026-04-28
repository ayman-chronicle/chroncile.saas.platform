"use client";

import { useRouter } from "next/navigation";
import { UIProviders } from "ui";

import { AnalyticsProvider } from "@/shared/analytics";
import { AuthSessionProvider } from "@/shared/auth/auth-session-provider";
import { DeveloperWidget } from "@/shared/developer-tools/developer-widget";
import { SentryIdentitySync } from "@/shared/observability/sentry-identity-sync";

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <UIProviders navigate={(href) => router.push(href)}>
      <AuthSessionProvider>
        <AnalyticsProvider>
          <SentryIdentitySync />
          {children}
          <DeveloperWidget />
        </AnalyticsProvider>
      </AuthSessionProvider>
    </UIProviders>
  );
}
