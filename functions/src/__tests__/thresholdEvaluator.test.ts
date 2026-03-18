const mockGet = jest.fn();
const mockSet = jest.fn();
const mockDoc = jest.fn(() => ({get: mockGet, set: mockSet}));
const mockCollection = jest.fn(() => ({doc: mockDoc}));

jest.mock("firebase-admin", () => ({
  firestore: () => ({collection: mockCollection}),
}));

import * as admin from "firebase-admin";
import {ThresholdEvaluator, ThresholdConfig} from "../lib/thresholdEvaluator";
import {PerformanceMetrics} from "../lib/perfApiClient";

describe("ThresholdEvaluator", () => {
  const defaultConfig: ThresholdConfig = {
    apiLatencyThresholdMs: 500,
    screenRenderThresholdMs: 100,
    successRateThresholdPct: 95,
    customTraceThresholds: {"db_query": 200, "image_load": 1000},
    dedupWindowMinutes: 30,
  };

  let evaluator: ThresholdEvaluator;
  const db = admin.firestore() as unknown as admin.firestore.Firestore;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockResolvedValue({exists: false});
    mockSet.mockResolvedValue(undefined);
    evaluator = new ThresholdEvaluator(defaultConfig, db);
  });

  function makeMetrics(overrides: Partial<PerformanceMetrics> = {}): PerformanceMetrics {
    return {
      networkRequests: [],
      screenRenders: [],
      customTraces: [],
      fetchedAt: Date.now(),
      ...overrides,
    };
  }

  test("detects network latency breach above threshold", async () => {
    const metrics = makeMetrics({
      networkRequests: [{
        url: "https://api.example.com/data",
        p95LatencyMs: 750,
        successRate: 0.99,
        sampleCount: 100,
        httpMethod: "GET",
      }],
    });

    const breaches = await evaluator.evaluate(metrics);

    expect(breaches).toHaveLength(1);
    expect(breaches[0]).toMatchObject({
      alertType: "perf_threshold_breach",
      metricName: "p95_latency",
      currentValue: 750,
      thresholdValue: 500,
      unit: "ms",
      direction: "above",
      resourceName: "https://api.example.com/data",
    });
  });

  test("ignores network request within threshold", async () => {
    const metrics = makeMetrics({
      networkRequests: [{
        url: "https://api.example.com/fast",
        p95LatencyMs: 200,
        successRate: 0.99,
        sampleCount: 50,
        httpMethod: "GET",
      }],
    });

    const breaches = await evaluator.evaluate(metrics);

    expect(breaches).toHaveLength(0);
  });

  test("detects success rate drop below threshold", async () => {
    const metrics = makeMetrics({
      networkRequests: [{
        url: "https://api.example.com/unstable",
        p95LatencyMs: 300,
        successRate: 0.85,
        sampleCount: 200,
        httpMethod: "POST",
      }],
    });

    const breaches = await evaluator.evaluate(metrics);

    expect(breaches).toHaveLength(1);
    expect(breaches[0]).toMatchObject({
      alertType: "perf_network_anomaly",
      metricName: "success_rate",
      currentValue: 85,
      thresholdValue: 95,
      direction: "below",
      unit: "%",
    });
  });

  test("detects screen render time breach", async () => {
    const metrics = makeMetrics({
      screenRenders: [{
        screenName: "HomeScreen",
        renderTimeMs: 250,
        slowRenderRate: 0.15,
        frozenRenderRate: 0.05,
        sampleCount: 500,
      }],
    });

    const breaches = await evaluator.evaluate(metrics);

    expect(breaches).toHaveLength(1);
    expect(breaches[0]).toMatchObject({
      alertType: "perf_threshold_breach",
      metricName: "screen_render_time",
      currentValue: 250,
      thresholdValue: 100,
      resourceName: "HomeScreen",
    });
  });

  test("detects custom trace breach for configured traces", async () => {
    const metrics = makeMetrics({
      customTraces: [{
        traceName: "db_query",
        durationMs: 350,
        sampleCount: 80,
      }],
    });

    const breaches = await evaluator.evaluate(metrics);

    expect(breaches).toHaveLength(1);
    expect(breaches[0]).toMatchObject({
      alertType: "perf_custom_trace",
      metricName: "trace_duration",
      currentValue: 350,
      thresholdValue: 200,
      resourceName: "db_query",
    });
  });

  test("ignores custom traces not in config", async () => {
    const metrics = makeMetrics({
      customTraces: [{
        traceName: "unknown_trace",
        durationMs: 9999,
        sampleCount: 10,
      }],
    });

    const breaches = await evaluator.evaluate(metrics);

    expect(breaches).toHaveLength(0);
  });

  test("deduplicates recently alerted breaches", async () => {
    const recentTimestamp = Date.now() - 5 * 60 * 1000; // 5 minutes ago
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({lastAlertedAt: recentTimestamp}),
    });

    const metrics = makeMetrics({
      networkRequests: [{
        url: "https://api.example.com/slow",
        p95LatencyMs: 750,
        successRate: 0.99,
        sampleCount: 100,
        httpMethod: "GET",
      }],
    });

    const breaches = await evaluator.evaluate(metrics);

    expect(breaches).toHaveLength(0);
    expect(mockSet).not.toHaveBeenCalled();
  });

  test("allows breach after dedup window expires", async () => {
    const oldTimestamp = Date.now() - 60 * 60 * 1000; // 1 hour ago (beyond 30 min window)
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({lastAlertedAt: oldTimestamp}),
    });

    const metrics = makeMetrics({
      networkRequests: [{
        url: "https://api.example.com/slow",
        p95LatencyMs: 750,
        successRate: 0.99,
        sampleCount: 100,
        httpMethod: "GET",
      }],
    });

    const breaches = await evaluator.evaluate(metrics);

    expect(breaches).toHaveLength(1);
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({lastAlertedAt: expect.any(Number)})
    );
  });
});
