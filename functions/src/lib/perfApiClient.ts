import {GoogleAuth, AuthClient} from "google-auth-library";
import {logger} from "firebase-functions";

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

// Cloud Monitoring API — where Firebase Performance data is actually stored
const MONITORING_API = "https://monitoring.googleapis.com/v3";

export class PerfApiClient {
  private auth: GoogleAuth;
  private config: PerfApiConfig;

  constructor(config: PerfApiConfig) {
    this.config = config;
    this.auth = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/monitoring.read"],
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

  /**
   * Queries Cloud Monitoring timeSeries API for Firebase Performance metrics.
   */
  private async queryTimeSeries(
    client: AuthClient,
    metricFilter: string,
    startMs: number,
    endMs: number,
    perSeriesAligner: string = "ALIGN_PERCENTILE_99",
    crossSeriesReducer: string = "REDUCE_NONE"
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any[]> {
    const startTime = new Date(startMs).toISOString();
    const endTime = new Date(endMs).toISOString();
    // Alignment period: at least 60s, or match the window
    const windowSec = Math.max(60, Math.floor((endMs - startMs) / 1000));
    const alignmentPeriod = `${windowSec}s`;

    const params = new URLSearchParams({
      "filter": metricFilter,
      "interval.startTime": startTime,
      "interval.endTime": endTime,
      "aggregation.alignmentPeriod": alignmentPeriod,
      "aggregation.perSeriesAligner": perSeriesAligner,
      "aggregation.crossSeriesReducer": crossSeriesReducer,
    });

    const url = `${MONITORING_API}/projects/${this.config.projectId}/timeSeries?${params.toString()}`;

    const response = await client.request({url, method: "GET"});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (response.data as any)?.timeSeries || [];
  }

  private async fetchNetworkMetrics(
    client: AuthClient,
    startMs: number,
    endMs: number
  ): Promise<NetworkRequestMetric[]> {
    try {
      // Firebase Performance network metrics in Cloud Monitoring
      const filter = 'metric.type = "firebaseperformance.googleapis.com/network_request/response_time"';
      const series = await this.queryTimeSeries(client, filter, startMs, endMs);

      return series.map((ts: any) => {
        const labels = ts.metric?.labels || {};
        const resLabels = ts.resource?.labels || {};
        const points = ts.points || [];
        const latestValue = points[0]?.value?.distributionValue?.mean ??
          points[0]?.value?.doubleValue ??
          points[0]?.value?.int64Value ?? 0;

        return {
          url: normalizeUrl(labels.url || labels.http_url || resLabels.url || "unknown"),
          p95LatencyMs: Math.round(Number(latestValue)),
          successRate: 1.0, // Success rate requires separate metric query
          sampleCount: points[0]?.value?.distributionValue?.count ?
            Number(points[0].value.distributionValue.count) : 1,
          httpMethod: labels.http_method || "GET",
        };
      });
    } catch (error: any) {
      const status = error?.response?.status || error?.code || "unknown";
      const body = JSON.stringify(error?.response?.data?.error?.message || error?.message || "no details");
      logger.error(`Failed to fetch network metrics: status=${status} body=${body}`);
      return [];
    }
  }

  private async fetchScreenMetrics(
    client: AuthClient,
    startMs: number,
    endMs: number
  ): Promise<ScreenRenderMetric[]> {
    try {
      const filter = 'metric.type = "firebaseperformance.googleapis.com/screen_trace/slow_rendering_ratio"';
      const series = await this.queryTimeSeries(
        client, filter, startMs, endMs, "ALIGN_MEAN"
      );

      return series.map((ts: any) => {
        const labels = ts.metric?.labels || {};
        const points = ts.points || [];
        const slowRate = points[0]?.value?.doubleValue ?? 0;

        return {
          screenName: labels.screen_name || labels.name || "unknown",
          renderTimeMs: 0, // Render time is a separate metric
          slowRenderRate: Number(slowRate),
          frozenRenderRate: 0, // Frozen render is a separate metric
          sampleCount: 1,
        };
      });
    } catch (error: any) {
      const status = error?.response?.status || error?.code || "unknown";
      const body = JSON.stringify(error?.response?.data?.error?.message || error?.message || "no details");
      logger.error(`Failed to fetch screen metrics: status=${status} body=${body}`);
      return [];
    }
  }

  private async fetchCustomTraces(
    client: AuthClient,
    startMs: number,
    endMs: number
  ): Promise<CustomTraceMetric[]> {
    try {
      const filter = 'metric.type = "firebaseperformance.googleapis.com/custom_trace/duration"';
      const series = await this.queryTimeSeries(client, filter, startMs, endMs);

      return series.map((ts: any) => {
        const labels = ts.metric?.labels || {};
        const points = ts.points || [];
        const latestValue = points[0]?.value?.distributionValue?.mean ??
          points[0]?.value?.doubleValue ??
          points[0]?.value?.int64Value ?? 0;

        return {
          traceName: labels.trace_name || labels.name || "unknown",
          durationMs: Math.round(Number(latestValue)),
          sampleCount: points[0]?.value?.distributionValue?.count ?
            Number(points[0].value.distributionValue.count) : 1,
        };
      });
    } catch (error: any) {
      const status = error?.response?.status || error?.code || "unknown";
      const body = JSON.stringify(error?.response?.data?.error?.message || error?.message || "no details");
      logger.error(`Failed to fetch custom traces: status=${status} body=${body}`);
      return [];
    }
  }

  // Keep public for tests
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parseNetworkResponse(data: any): NetworkRequestMetric[] {
    if (!data || !data.timeSeries) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.timeSeries.map((ts: any) => {
      const labels = ts.metric?.labels || {};
      const points = ts.points || [];
      return {
        url: normalizeUrl(labels.url || "unknown"),
        p95LatencyMs: Math.round(Number(points[0]?.value?.doubleValue ?? 0)),
        successRate: 1.0,
        sampleCount: 1,
        httpMethod: labels.http_method || "GET",
      };
    });
  }
}

/**
 * Normalizes URLs by masking numeric IDs and UUIDs in path segments.
 * Prevents high-cardinality URL paths from creating excessive unique metrics.
 * E.g. "user/12345" becomes "user/*", UUIDs become "*".
 */
export function normalizeUrl(url: string): string {
  const uuidPattern = new RegExp(
    "\\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9]+)",
    "gi"
  );
  return url.replace(uuidPattern, "/*");
}
