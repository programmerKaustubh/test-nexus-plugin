"use strict";
/**
 * Crashlytics alert triggers.
 *
 * Listens for all 6 Crashlytics event types via Firebase Alerts and forwards
 * them to the TestNexus backend for per-token routing and notification delivery.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.onStabilityDigest = exports.onVelocityAlert = exports.onRegression = exports.onNewAnrIssue = exports.onNewNonfatalIssue = exports.onNewFatalIssue = void 0;
const crashlytics_1 = require("firebase-functions/v2/alerts/crashlytics");
const functions = __importStar(require("firebase-functions/v2"));
const config_1 = require("../config");
const httpClient_1 = require("../lib/httpClient");
const sanitizer_1 = require("../lib/sanitizer");
/**
 * Shared handler for all Crashlytics event types.
 *
 * Builds a normalized payload from the Firebase Alert event and forwards it
 * to the TestNexus backend for each configured connection token.
 *
 * @param alertType - The alert type identifier (fatal, nonfatal, anr, etc.)
 * @param event - The Firebase Alert event
 */
async function handleCrashlyticsEvent(alertType, event) {
    try {
        const config = (0, config_1.getConfig)();
        functions.logger.info(`Received ${alertType} event`, {
            appIdentifier: config.appIdentifier,
        });
        const payload = {
            alertType,
            appIdentifier: (0, sanitizer_1.sanitizeField)(config.appIdentifier, 100),
            issueId: (0, sanitizer_1.sanitizeField)(event.data?.payload?.issue?.id || "", 100),
            issueTitle: (0, sanitizer_1.sanitizeField)(event.data?.payload?.issue?.title || "", 300),
            issueSubtitle: (0, sanitizer_1.sanitizeField)(event.data?.payload?.issue?.subtitle || "", 300),
            appVersion: (0, sanitizer_1.sanitizeField)(event.data?.payload?.issue?.appVersion || "", 50),
            bundleId: (0, sanitizer_1.sanitizeField)(event.appId || "", 200),
            platform: "android",
            crashCount: event.data?.payload?.issue?.crashCount || 0,
            crashPercentage: event.data?.payload?.issue?.crashPercentage || null,
        };
        functions.logger.info("Sending alert to TestNexus", {
            alertType,
            bundleId: payload.bundleId,
            tokenCount: config.connectionTokens.length,
        });
        const success = await (0, httpClient_1.sendToTestNexus)(payload, config.connectionTokens, config.apiBaseUrl, "/receiveCrashlyticsAlert");
        if (!success) {
            functions.logger.error("Alert forwarding failed for ALL configured tokens. " +
                "Check your connection tokens in the extension configuration.");
        }
    }
    catch (error) {
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
exports.onNewFatalIssue = (0, crashlytics_1.onNewFatalIssuePublished)(async (event) => {
    await handleCrashlyticsEvent("fatal", event);
});
/** Fires when a new non-fatal (handled exception) is logged. */
exports.onNewNonfatalIssue = (0, crashlytics_1.onNewNonfatalIssuePublished)(async (event) => {
    await handleCrashlyticsEvent("nonfatal", event);
});
/** Fires when a new ANR (Application Not Responding) is detected. */
exports.onNewAnrIssue = (0, crashlytics_1.onNewAnrIssuePublished)(async (event) => {
    await handleCrashlyticsEvent("anr", event);
});
/** Fires when a previously-closed issue reappears (regression). */
exports.onRegression = (0, crashlytics_1.onRegressionAlertPublished)(async (event) => {
    await handleCrashlyticsEvent("regression", event);
});
/** Fires when a crash rate is accelerating rapidly (velocity alert). */
exports.onVelocityAlert = (0, crashlytics_1.onVelocityAlertPublished)(async (event) => {
    await handleCrashlyticsEvent("velocity", event);
});
/** Fires for periodic stability digest summaries of trending issues. */
exports.onStabilityDigest = (0, crashlytics_1.onStabilityDigestPublished)(async (event) => {
    await handleCrashlyticsEvent("digest", event);
});
//# sourceMappingURL=crashlytics.js.map