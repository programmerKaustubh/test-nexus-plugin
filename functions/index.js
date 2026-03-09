/**
 * TestNexus Crashlytics Alerts — Firebase Extension
 *
 * Listens for Crashlytics events via Firebase Alerts and forwards
 * them to the TestNexus backend.
 * Installed on the USER'S Firebase project, not the TestNexus project.
 */

const {
  onNewFatalIssuePublished,
  onNewNonfatalIssuePublished,
  onNewAnrIssuePublished,
  onRegressionAlertPublished,
  onVelocityAlertPublished,
  onStabilityDigestPublished,
} = require("firebase-functions/v2/alerts/crashlytics");
const {logger} = require("firebase-functions");
const {postAlert} = require("./lib/httpClient");
const {buildPayload} = require("./lib/payloadBuilder");

// Extension parameters (configured by user during installation)
const CONNECTION_TOKENS = [...new Set(
    (process.env.CONNECTION_TOKEN || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
)];
const APP_IDENTIFIER = process.env.APP_IDENTIFIER || "Unknown App";
const BACKEND_URL = process.env.TESTNEXUS_BACKEND_URL || "https://us-central1-test-nexus-prod.cloudfunctions.net/receiveCrashlyticsAlert";

/**
 * Shared handler for all Crashlytics event types.
 * Forwards alert to backend for each configured token.
 * Backend handles per-token alert type filtering and recipient routing.
 *
 * @param {string} alertType - The alert type identifier
 * @param {object} event - The Firebase Alert event
 */
async function handleCrashlyticsEvent(alertType, event) {
  logger.info(`Received ${alertType} event`, {appIdentifier: APP_IDENTIFIER});

  if (CONNECTION_TOKENS.length === 0) {
    logger.error("No CONNECTION_TOKENS configured. Cannot forward alert.");
    return;
  }

  // Adapt Firebase Alert event shape to payloadBuilder format
  // Firebase Alerts: event.data = { payload: { issue: {...} }, createTime, ... }
  // Also: event.appId = the app's bundle ID
  const alertData = {
    data: {
      ...(event.data?.payload || {}),
      bundleId: event.appId || "",
    },
  };

  // Build normalized payload
  const payload = buildPayload(alertType, alertData, APP_IDENTIFIER);

  logger.info("Sending alert to TestNexus", {
    alertType,
    bundleId: payload.bundleId,
    tokenCount: CONNECTION_TOKENS.length,
  });

  // Forward to backend for each token — fault isolated
  const results = await Promise.allSettled(
      CONNECTION_TOKENS.map((token) => postAlert(BACKEND_URL, token, payload)),
  );

  let successCount = 0;
  results.forEach((result, idx) => {
    if (result.status === "fulfilled" && result.value.statusCode >= 200 && result.value.statusCode < 300) {
      successCount++;
      logger.info(`Token ${idx + 1}/${CONNECTION_TOKENS.length}: forwarded successfully`, {
        statusCode: result.value.statusCode,
        alertId: result.value.body?.alertId,
        notifiedUsers: result.value.body?.notifiedUsers,
      });
    } else {
      const errorMsg = result.status === "fulfilled" ?
        `HTTP ${result.value.statusCode}: ${JSON.stringify(result.value.body)}` :
        (result.reason?.message || "Unknown error");
      logger.error(`Token ${idx + 1}/${CONNECTION_TOKENS.length}: failed to forward`, {
        alertType,
        error: errorMsg,
      });
    }
  });

  // Warn if no tokens succeeded — likely a configuration issue
  if (successCount === 0 && CONNECTION_TOKENS.length > 0) {
    logger.error("Alert forwarding failed for ALL configured tokens. Check your connection tokens in the extension configuration.");
  }
}

// ============================================
// Crashlytics Event Handlers (6 triggers)
//
// Each handler listens for a specific Crashlytics alert type via Firebase Alerts.
// The extension.yaml maps these exports to event triggers.
// All handlers delegate to handleCrashlyticsEvent for unified processing.
// ============================================

/** Fires when a new fatal crash is detected (app killed). */
exports.onNewFatalIssue = onNewFatalIssuePublished(async (event) => {
  await handleCrashlyticsEvent("fatal", event);
});

/** Fires when a new non-fatal (handled exception) is logged. */
exports.onNewNonfatalIssue = onNewNonfatalIssuePublished(async (event) => {
  await handleCrashlyticsEvent("nonfatal", event);
});

/** Fires when a new ANR (Application Not Responding) is detected. */
exports.onNewAnrIssue = onNewAnrIssuePublished(async (event) => {
  await handleCrashlyticsEvent("anr", event);
});

/** Fires when a previously-closed issue reappears (regression). */
exports.onRegression = onRegressionAlertPublished(async (event) => {
  await handleCrashlyticsEvent("regression", event);
});

/** Fires when a crash rate is accelerating rapidly (velocity alert). */
exports.onVelocityAlert = onVelocityAlertPublished(async (event) => {
  await handleCrashlyticsEvent("velocity", event);
});

/** Fires for periodic stability digest summaries of trending issues. */
exports.onStabilityDigest = onStabilityDigestPublished(async (event) => {
  await handleCrashlyticsEvent("digest", event);
});
