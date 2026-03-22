/**
 * Shared configuration reader for all triggers.
 *
 * Reads extension parameters from process.env with validation and safe defaults.
 * Invalid values fall back to defaults and log a warning — never crash.
 */

import * as functions from "firebase-functions/v2";

export interface ExtensionConfig {
  // Shared
  connectionTokens: string[];
  appIdentifier: string;
  apiBaseUrl: string;
  projectId: string;

  // Remote Config
  watchlistKeys: string;
  notifyAllConfigChanges: boolean;
  includeValues: boolean;

  // Performance
  perfCheckInterval: number;
  latencyThresholdMs: number;
  screenRenderThresholdMs: number;
  successRateThresholdPct: number;
  customTraceThresholds: Record<string, number>;
  dedupWindowMinutes: number;
}

export function getConfig(): ExtensionConfig {
  const rawTokens = process.env.CONNECTION_TOKEN || "";
  const connectionTokens = [
    ...new Set(
      rawTokens
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    ),
  ];

  return {
    connectionTokens,
    appIdentifier: process.env.APP_IDENTIFIER || "Unknown App",
    apiBaseUrl: getApiBaseUrl(),
    projectId:
      process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || "",

    watchlistKeys: process.env.WATCHLIST_KEYS || "",
    notifyAllConfigChanges: process.env.NOTIFY_ALL_CONFIG_CHANGES !== "false",
    includeValues: process.env.INCLUDE_VALUES === "true",

    perfCheckInterval: safeParseInt(process.env.PERF_CHECK_INTERVAL, 5),
    latencyThresholdMs: safeParseInt(process.env.LATENCY_THRESHOLD_MS, 3000),
    screenRenderThresholdMs: safeParseInt(process.env.SCREEN_RENDER_THRESHOLD_MS, 700),
    successRateThresholdPct: safeParseInt(process.env.SUCCESS_RATE_THRESHOLD_PCT, 95),
    customTraceThresholds: safeParseJson(process.env.CUSTOM_TRACE_THRESHOLDS || "{}"),
    dedupWindowMinutes: safeParseInt(process.env.DEDUP_WINDOW_MINUTES, 15),
  };
}

function safeParseInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    functions.logger.warn(`Invalid integer value "${value}", using default ${fallback}`);
    return fallback;
  }
  return parsed;
}

function safeParseJson(json: string): Record<string, number> {
  if (!json || json.trim() === "") return {};
  try {
    return JSON.parse(json);
  } catch {
    functions.logger.warn(`Invalid JSON in CUSTOM_TRACE_THRESHOLDS (length: ${json.length}), using empty object`);
    return {};
  }
}

// Trusted TestNexus backend domains — prevents SSRF token exfiltration
const TRUSTED_DOMAINS = [
  "us-central1-test-nexus-prod.cloudfunctions.net",
  "us-east1-test-nexus-prod.cloudfunctions.net",
  "europe-west1-test-nexus-prod.cloudfunctions.net",
  "asia-northeast1-test-nexus-prod.cloudfunctions.net",
];

function getApiBaseUrl(): string {
  const url = process.env.TESTNEXUS_API_URL || process.env.TESTNEXUS_BACKEND_URL;
  if (!url) {
    functions.logger.error(
      "TESTNEXUS_API_URL is not configured. Extension cannot send alerts. " +
      "Reconfigure the extension and provide the backend URL."
    );
    return "";
  }

  // Validate URL against trusted domain whitelist to prevent SSRF
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") {
      functions.logger.error("TESTNEXUS_API_URL must use HTTPS. Blocking request.");
      return "";
    }
    if (!TRUSTED_DOMAINS.includes(parsed.hostname)) {
      functions.logger.error(
        `TESTNEXUS_API_URL hostname "${parsed.hostname}" is not a trusted TestNexus domain. ` +
        "If you changed this URL, reconfigure with the default value. Blocking request."
      );
      return "";
    }
  } catch {
    functions.logger.error(`TESTNEXUS_API_URL is not a valid URL: "${url}". Blocking request.`);
    return "";
  }

  return url;
}
