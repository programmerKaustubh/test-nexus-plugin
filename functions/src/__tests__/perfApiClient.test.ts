const mockRequest = jest.fn();

jest.mock("google-auth-library", () => ({
  GoogleAuth: jest.fn().mockImplementation(() => ({
    getClient: jest.fn().mockResolvedValue({
      request: mockRequest,
    }),
  })),
}));

jest.mock("firebase-functions/v2", () => ({
  logger: {warn: jest.fn(), info: jest.fn(), error: jest.fn()},
}));

import {PerfApiClient, PerfApiConfig} from "../lib/perfApiClient";

describe("PerfApiClient", () => {
  const config: PerfApiConfig = {
    projectId: "test-project-123",
    timeWindowMinutes: 5,
  };

  let client: PerfApiClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new PerfApiClient(config);
  });

  test("fetchMetrics returns structured metrics from API response", async () => {
    mockRequest.mockResolvedValue({
      data: {
        perfMetrics: [
          {
            resourceName: "https://api.example.com/users",
            responseTime: {p95: 320},
            successRate: {value: 0.98},
            requestCount: 150,
            httpMethod: "GET",
          },
        ],
      },
    });

    const metrics = await client.fetchMetrics();

    expect(metrics.networkRequests).toHaveLength(1);
    expect(metrics.networkRequests[0]).toMatchObject({
      url: "https://api.example.com/users",
      p95LatencyMs: 320,
      successRate: 0.98,
      sampleCount: 150,
      httpMethod: "GET",
    });
    expect(metrics.fetchedAt).toBeGreaterThan(0);
    expect(metrics.screenRenders).toBeDefined();
    expect(metrics.customTraces).toBeDefined();
  });

  test("fetchMetrics returns empty arrays when API returns no data", async () => {
    mockRequest.mockResolvedValue({data: {}});

    const metrics = await client.fetchMetrics();

    expect(metrics.networkRequests).toEqual([]);
    expect(metrics.screenRenders).toEqual([]);
    expect(metrics.customTraces).toEqual([]);
    expect(metrics.fetchedAt).toBeGreaterThan(0);
  });

  test("fetchMetrics handles API errors gracefully (returns empty arrays)", async () => {
    mockRequest.mockRejectedValue(new Error("API unavailable"));

    const metrics = await client.fetchMetrics();

    expect(metrics.networkRequests).toEqual([]);
    expect(metrics.screenRenders).toEqual([]);
    expect(metrics.customTraces).toEqual([]);
    expect(metrics.fetchedAt).toBeGreaterThan(0);
  });

  test("fetchDailySummary uses 24-hour window", async () => {
    mockRequest.mockResolvedValue({data: {perfMetrics: []}});

    const beforeCall = Date.now();
    await client.fetchDailySummary();

    // Verify that the request was made with a ~24-hour time window
    // The first call is for network metrics
    expect(mockRequest).toHaveBeenCalled();
    const firstCallArgs = mockRequest.mock.calls[0][0];
    const startTime = new Date(firstCallArgs.data.timeRange.startTime).getTime();
    const endTime = new Date(firstCallArgs.data.timeRange.endTime).getTime();

    const windowMs = endTime - startTime;
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;

    // Allow 5 second tolerance for test execution time
    expect(windowMs).toBeGreaterThanOrEqual(twentyFourHoursMs - 5000);
    expect(windowMs).toBeLessThanOrEqual(twentyFourHoursMs + 5000);
    expect(endTime).toBeGreaterThanOrEqual(beforeCall);
  });

  test("parseNetworkResponse extracts correct fields", () => {
    const rawData = {
      perfMetrics: [
        {
          resourceName: "https://api.example.com/orders",
          responseTime: {p95: 450},
          successRate: {value: 0.97},
          requestCount: 80,
          httpMethod: "POST",
        },
        {
          url: "https://api.example.com/health",
          p95LatencyMs: 50,
          successRate: 1.0,
          sampleCount: 500,
          httpMethod: "GET",
        },
      ],
    };

    const result = client.parseNetworkResponse(rawData);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      url: "https://api.example.com/orders",
      p95LatencyMs: 450,
      successRate: 0.97,
      sampleCount: 80,
      httpMethod: "POST",
    });
    expect(result[1]).toEqual({
      url: "https://api.example.com/health",
      p95LatencyMs: 50,
      successRate: 1.0,
      sampleCount: 500,
      httpMethod: "GET",
    });
  });
});
