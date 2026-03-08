type AnalyticsPrimitive = string | number | boolean | null | undefined;

export type AnalyticsProperties = Record<string, AnalyticsPrimitive>;

export interface AnalyticsDebugInfo {
  provider: string;
  configured: boolean;
  keyPresent: boolean;
  host: string | null;
  sessionId: string | null;
  distinctId: string | null;
}

export interface AnalyticsClient {
  identify(distinctId: string, properties?: AnalyticsProperties): void;
  reset(): void;
  track(event: string, properties?: AnalyticsProperties): void;
  page(path: string, properties?: AnalyticsProperties): void;
  getDebugInfo(): AnalyticsDebugInfo;
}
