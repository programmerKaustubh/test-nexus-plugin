import {GoogleAuth, AuthClient} from "google-auth-library";
import * as functions from "firebase-functions/v2";

export interface PerformanceMetrics {
  networkRequests: NetworkRequestMetric[];
  screenRenders: ScreenRenderMetric[];
  customTraces: CustomTraceMetric[];
  fetchedAt: number;
}

export interface NetworkRequestMetric {
  url: string;
  p95LatencyMs: number;
  successRate: number;
  sampleCount: number;
  httpMethod: string;
}

export interface ScreenRenderMetric {
  screenName: string;
  renderTimeMs: number;
  slowRenderRate: number;
  frozenRenderRate: number;
  sampleCount: number;
}

export interface CustomTraceMetric {
  traceName: string;
  durationMs: number;
  sampleCount: number;
}

export interface PerfApiConfig {
  projectId: string;
  timeWindowMinutes: number;
}

const PERF_API_BASE = "https://firebaseperformance.googleapis.com/v1";
const PAGE_SIZE = 500;
const MAX_PAGES = 5; // Safety limit: 500 * 5 = 2500 metrics max

export class PerfApiClient {
  private auth: GoogleAuth;
  private config: PerfApiConfig;

  constructor(config: PerfApiConfig) {
    this.config = config;
    this.auth = new GoogleAuth({
      scopes: [
        "https://www.googleapis.com/auth/firebase",
        "https://www.googleapis.com/auth/cloud-platform",
      ],
    });
  }

  async fetchMetrics(): Promise<PerformanceMetrics> {
    const client = await this.auth.getClient();
    const now = Date.now();
    const windowStart = now - this.config.timeWindowMinutes * 60 * 1000;

    const [networkRequests, screenRenders, customTraces] = await Promise.all([
      this.fetchNetworkMetrics(client, windowStart, now),
      this.fetchScreenMetrics(client, windowStart, now),
      this.fetchCustomTraces(client, windowStart, now),
    ]);

    return {networkRequests, screenRenders, customTraces, fetchedAt: now};
  }

  async fetchDailySummary(): Promise<PerformanceMetrics> {
    const client = await this.auth.getClient();
    const now = Date.now();
    const dayStart = now - 24 * 60 * 60 * 1000;

    const [networkRequests, screenRenders, customTraces] = await Promise.all([
      this.fetchNetworkMetrics(client, dayStart, now),
      this.fetchScreenMetrics(client, dayStart, now),
      this.fetchCustomTraces(client, dayStart, now),
    ]);

    return {networkRequests, screenRenders, customTraces, fetchedAt: now};
  }

  private async fetchNetworkMetrics(
    client: AuthClient,
    startMs: number,
    endMs: number
  ): Promise<NetworkRequestMetric[]> {
    try {
      const allResults: NetworkRequestMetric[] = [];
      let pageToken: string | undefined;

      for (let page = 0; page < MAX_PAGES; page++) {
        const url = `${PERF_API_BASE}/projects/${this.config.projectId}/perfMetrics:query`;
        const response = await client.request({
          url,
          method: "POST",
          data: {
            timeRange: {
              startTime: new Date(startMs).toISOString(),
              endTime: new Date(endMs).toISOString(),
            },
            metrics: [
              "RESPONSE_TIME",
              "NETWORK_SUCCESS_RATE",
              "REQUEST_COUNT",
            ],
            resourceType: "NETWORK_REQUEST",
            pageSize: PAGE_SIZE,
            ...(pageToken ? { pageToken } : {}),
          },
        });

        allResults.push(...this.parseNetworkResponse(response.data));
        pageToken = (response.data as any)?.nextPageToken;
        if (!pageToken) break;
      }

      return allResults;
    } catch (error) {
      functions.logger.error("Failed to fetch network metrics", {error});
      return [];
    }
  }

  private async fetchScreenMetrics(
    client: AuthClient,
    startMs: number,
    endMs: number
  ): Promise<ScreenRenderMetric[]> {
    try {
      const allResults: ScreenRenderMetric[] = [];
      let pageToken: string | undefined;

      for (let page = 0; page < MAX_PAGES; page++) {
        const url = `${PERF_API_BASE}/projects/${this.config.projectId}/perfMetrics:query`;
        const response = await client.request({
          url,
          method: "POST",
          data: {
            timeRange: {
              startTime: new Date(startMs).toISOString(),
              endTime: new Date(endMs).toISOString(),
            },
            metrics: [
              "SCREEN_RENDER_TIME",
              "SLOW_RENDER_RATE",
              "FROZEN_RENDER_RATE",
              "RENDER_COUNT",
            ],
            resourceType: "SCREEN_RENDER",
            pageSize: PAGE_SIZE,
            ...(pageToken ? { pageToken } : {}),
          },
        });

        allResults.push(...this.parseScreenResponse(response.data));
        pageToken = (response.data as any)?.nextPageToken;
        if (!pageToken) break;
      }

      return allResults;
    } catch (error) {
      functions.logger.error("Failed to fetch screen metrics", {error});
      return [];
    }
  }

  private async fetchCustomTraces(
    client: AuthClient,
    startMs: number,
    endMs: number
  ): Promise<CustomTraceMetric[]> {
    try {
      const allResults: CustomTraceMetric[] = [];
      let pageToken: string | undefined;

      for (let page = 0; page < MAX_PAGES; page++) {
        const url = `${PERF_API_BASE}/projects/${this.config.projectId}/perfMetrics:query`;
        const response = await client.request({
          url,
          method: "POST",
          data: {
            timeRange: {
              startTime: new Date(startMs).toISOString(),
              endTime: new Date(endMs).toISOString(),
            },
            metrics: [
              "TRACE_DURATION",
              "TRACE_COUNT",
            ],
            resourceType: "CUSTOM_TRACE",
            pageSize: PAGE_SIZE,
            ...(pageToken ? { pageToken } : {}),
          },
        });

        allResults.push(...this.parseCustomTraceResponse(response.data));
        pageToken = (response.data as any)?.nextPageToken;
        if (!pageToken) break;
      }

      return allResults;
    } catch (error) {
      functions.logger.error("Failed to fetch custom traces", {error});
      return [];
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parseNetworkResponse(data: any): NetworkRequestMetric[] {
    if (!data || !data.perfMetrics) {
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.perfMetrics.map((metric: any) => ({
      url: normalizeUrl(metric.resourceName || metric.url || "unknown"),
      p95LatencyMs: metric.responseTime?.p95 ?? metric.p95LatencyMs ?? 0,
      successRate: metric.successRate?.value ?? metric.successRate ?? 1.0,
      sampleCount: metric.requestCount ?? metric.sampleCount ?? 0,
      httpMethod: metric.httpMethod || "GET",
    }));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseScreenResponse(data: any): ScreenRenderMetric[] {
    if (!data || !data.perfMetrics) {
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.perfMetrics.map((metric: any) => ({
      screenName: metric.resourceName || metric.screenName || "unknown",
      renderTimeMs: metric.renderTime?.p95 ?? metric.renderTimeMs ?? 0,
      slowRenderRate: metric.slowRenderRate?.value ?? metric.slowRenderRate ?? 0,
      frozenRenderRate: metric.frozenRenderRate?.value ?? metric.frozenRenderRate ?? 0,
      sampleCount: metric.renderCount ?? metric.sampleCount ?? 0,
    }));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseCustomTraceResponse(data: any): CustomTraceMetric[] {
    if (!data || !data.perfMetrics) {
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.perfMetrics.map((metric: any) => ({
      traceName: metric.resourceName || metric.traceName || "unknown",
      durationMs: metric.traceDuration?.p95 ?? metric.durationMs ?? 0,
      sampleCount: metric.traceCount ?? metric.sampleCount ?? 0,
    }));
  }
}

/**
 * Normalizes URLs by masking numeric IDs and UUIDs in path segments.
 * Prevents high-cardinality URL paths from creating excessive unique metrics.
 * E.g. "user/12345" becomes "user/*", UUIDs become "*".
 */
export function normalizeUrl(url: string): string {
  // Match UUID segments or pure numeric segments in URL paths
  const uuidPattern = new RegExp(
    "\\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9]+)",
    "gi"
  );
  return url.replace(uuidPattern, "/*");
}
