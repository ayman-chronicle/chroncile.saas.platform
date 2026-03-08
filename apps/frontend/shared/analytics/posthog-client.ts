import posthog from "posthog-js";
import type {
  AnalyticsClient,
  AnalyticsDebugInfo,
  AnalyticsProperties,
} from "./types";

const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? null;
const posthogKeyPresent = Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);

class PostHogAnalyticsClient implements AnalyticsClient {
  identify(distinctId: string, properties?: AnalyticsProperties): void {
    posthog.identify(distinctId, properties);
  }

  reset(): void {
    posthog.reset();
  }

  track(event: string, properties?: AnalyticsProperties): void {
    posthog.capture(event, properties);
  }

  page(path: string, properties?: AnalyticsProperties): void {
    posthog.capture("$pageview", {
      $pathname: path,
      ...properties,
    });
  }

  getDebugInfo(): AnalyticsDebugInfo {
    return {
      provider: "posthog",
      configured: true,
      keyPresent: posthogKeyPresent,
      host: posthogHost,
      sessionId: posthog.get_session_id() ?? null,
      distinctId: posthog.get_distinct_id() ?? null,
    };
  }
}

export function createPostHogAnalyticsClient(): AnalyticsClient {
  return new PostHogAnalyticsClient();
}
