import posthog from "posthog-js";
import { initializeSentry } from "./shared/observability/sentry-client";

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

initializeSentry();

if (posthogKey && posthogHost) {
  try {
    posthog.init(posthogKey, {
      api_host: posthogHost,
      defaults: "2026-01-30",
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Failed to initialize PostHog", error);
    }
  }
}
