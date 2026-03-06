/**
 * TestNexus Crashlytics Alerts — Firebase Extension
 *
 * Listens for Crashlytics events and forwards them to the TestNexus backend.
 * Installed on the USER'S Firebase project, not the TestNexus project.
 */

const {onCustomEventPublished} = require("firebase-functions/v2/eventarc");
const {logger} = require("firebase-functions");
const {postAlert} = require("./lib/httpClient");
const {buildPayload} = require("./lib/payloadBuilder");

// Extension parameters (configured by user during installation)
const CONNECTION_TOKEN = process.env.CONNECTION_TOKEN;
const APP_IDENTIFIER = process.env.APP_IDENTIFIER || "Unknown App";
const RECIPIENT_EMAILS = process.env.RECIPIENT_EMAILS || "";
const ALERT_TYPES = (process.env.ALERT_TYPES || "fatal,nonfatal,anr,regression,velocity,digest").split(",");
const BACKEND_URL = process.env.TESTNEXUS_BACKEND_URL || "https://us-central1-test-nexus-prod.cloudfunctions.net/receiveCrashlyticsAlert";

/**
 * Shared handler for all Crashlytics event types.
 *
 * @param {string} alertType - The alert type identifier
 * @param {object} event - The EventArc event
 */
async function handleCrashlyticsEvent(alertType, event) {
  logger.info(`Received ${alertType} event`, {appIdentifier: APP_IDENTIFIER});

  // Check if this alert type is enabled
  if (!ALERT_TYPES.includes(alertType)) {
    logger.info(`Alert type "${alertType}" is not enabled, skipping`);
    return;
  }

  // Validate token is configured
  if (!CONNECTION_TOKEN) {
    logger.error("CONNECTION_TOKEN is not configured. Cannot forward alert.");
    return;
  }

  // Build normalized payload
  const payload = buildPayload(alertType, event, APP_IDENTIFIER);

  // Add recipient emails to payload (backend uses them for user lookup)
  payload.recipientEmails = RECIPIENT_EMAILS.split(",")
      .map((e) => e.trim())
      .filter((e) => e.length > 0);

  logger.info("Sending alert to TestNexus", {alertType, issueTitle: payload.issueTitle});

  try {
    const result = await postAlert(BACKEND_URL, CONNECTION_TOKEN, payload);
    logger.info("Alert forwarded successfully", {
      statusCode: result.statusCode,
      alertId: result.body?.alertId,
      notifiedUsers: result.body?.notifiedUsers,
    });
  } catch (error) {
    logger.error("Failed to forward alert after retries", {
      alertType,
      error: error.message,
    });
  }
}

// ============================================
// Crashlytics Event Handlers (6 triggers)
// ============================================

exports.onNewFatalIssue = onCustomEventPublished(
    "google.firebase.crashlytics.newFatalIssue.v1",
    async (event) => {
      await handleCrashlyticsEvent("fatal", event);
    },
);

exports.onNewNonfatalIssue = onCustomEventPublished(
    "google.firebase.crashlytics.newNonfatalIssue.v1",
    async (event) => {
      await handleCrashlyticsEvent("nonfatal", event);
    },
);

exports.onNewAnrIssue = onCustomEventPublished(
    "google.firebase.crashlytics.newAnrIssue.v1",
    async (event) => {
      await handleCrashlyticsEvent("anr", event);
    },
);

exports.onRegression = onCustomEventPublished(
    "google.firebase.crashlytics.regression.v1",
    async (event) => {
      await handleCrashlyticsEvent("regression", event);
    },
);

exports.onVelocityAlert = onCustomEventPublished(
    "google.firebase.crashlytics.newTrendingIssueDetected.v1",
    async (event) => {
      await handleCrashlyticsEvent("velocity", event);
    },
);

exports.onStabilityDigest = onCustomEventPublished(
    "google.firebase.crashlytics.stabilityDigest.v1",
    async (event) => {
      await handleCrashlyticsEvent("digest", event);
    },
);
