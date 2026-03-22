/**
 * Crashlytics alert triggers.
 *
 * Listens for all 6 Crashlytics event types via Firebase Alerts and forwards
 * them to the TestNexus backend for per-token routing and notification delivery.
 */

import {
  onNewFatalIssuePublished,
  onNewNonfatalIssuePublished,
  onNewAnrIssuePublished,
  onRegressionAlertPublished,
  onVelocityAlertPublished,
  onStabilityDigestPublished,
} from "firebase-functions/v2/alerts/crashlytics";
import * as functions from "firebase-functions/v2";
import { getConfig } from "../config";
import { sendToTestNexus } from "../lib/httpClient";
import { sanitizeField } from "../lib/sanitizer";

/**
 * Shared handler for all Crashlytics event types.
 *
 * Builds a normalized payload from the Firebase Alert event and forwards it
 * to the TestNexus backend for each configured connection token.
 *
 * @param alertType - The alert type identifier (fatal, nonfatal, anr, etc.)
 * @param event - The Firebase Alert event
 */
async function handleCrashlyticsEvent(
  alertType: string,
  event: functions.alerts.AlertEvent<any>
): Promise<void> {
  try {
    const config = getConfig();

    functions.logger.info(`Received ${alertType} event`, {
      appIdentifier: config.appIdentifier,
    });

    const payload = {
      alertType,
      appIdentifier: sanitizeField(config.appIdentifier, 100),
      issueId: sanitizeField(event.data?.payload?.issue?.id || "", 100),
      issueTitle: sanitizeField(event.data?.payload?.issue?.title || "", 300),
      issueSubtitle: sanitizeField(event.data?.payload?.issue?.subtitle || "", 300),
      appVersion: sanitizeField(event.data?.payload?.issue?.appVersion || "", 50),
      bundleId: sanitizeField(event.appId || "", 200),
      platform: "android",
      crashCount: event.data?.payload?.issue?.crashCount || 0,
      crashPercentage: event.data?.payload?.issue?.crashPercentage || null,
    };

    functions.logger.info("Sending alert to TestNexus", {
      alertType,
      bundleId: payload.bundleId,
      tokenCount: config.connectionTokens.length,
    });

    const success = await sendToTestNexus(
      payload,
      config.connectionTokens,
      config.apiBaseUrl,
      "/receiveCrashlyticsAlert"
    );

    if (!success) {
      functions.logger.error(
        "Alert forwarding failed for ALL configured tokens. " +
          "Check your connection tokens in the extension configuration."
      );
    }
  } catch (error) {
    functions.logger.error(`Error handling ${alertType} event`, { error });
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
export const onNewFatalIssue = onNewFatalIssuePublished(async (event) => {
  await handleCrashlyticsEvent("fatal", event);
});

/** Fires when a new non-fatal (handled exception) is logged. */
export const onNewNonfatalIssue = onNewNonfatalIssuePublished(async (event) => {
  await handleCrashlyticsEvent("nonfatal", event);
});

/** Fires when a new ANR (Application Not Responding) is detected. */
export const onNewAnrIssue = onNewAnrIssuePublished(async (event) => {
  await handleCrashlyticsEvent("anr", event);
});

/** Fires when a previously-closed issue reappears (regression). */
export const onRegression = onRegressionAlertPublished(async (event) => {
  await handleCrashlyticsEvent("regression", event);
});

/** Fires when a crash rate is accelerating rapidly (velocity alert). */
export const onVelocityAlert = onVelocityAlertPublished(async (event) => {
  await handleCrashlyticsEvent("velocity", event);
});

/** Fires for periodic stability digest summaries of trending issues. */
export const onStabilityDigest = onStabilityDigestPublished(async (event) => {
  await handleCrashlyticsEvent("digest", event);
});
