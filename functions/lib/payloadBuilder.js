/**
 * Payload Builder
 *
 * Normalizes Crashlytics event payloads into the TestNexus schema.
 * Each event type has different data shapes — this module handles all 6.
 */

const {logger} = require("firebase-functions");

/**
 * Builds a normalized TestNexus payload from a Crashlytics event.
 *
 * @param {string} alertType - One of: fatal, nonfatal, anr, regression, velocity, digest
 * @param {object} event - The raw EventArc event from Crashlytics
 * @param {string} appIdentifier - User-configured app name
 * @return {object} Normalized payload for the TestNexus backend
 */
function buildPayload(alertType, event, appIdentifier) {
  const data = event.data || {};

  // Common fields across all event types
  const base = {
    alertType,
    appIdentifier,
    platform: "android",
    bundleId: data.bundleId || data.appId || "",
  };

  switch (alertType) {
    case "fatal":
    case "nonfatal":
    case "anr":
      return buildIssuePayload(base, data);
    case "regression":
      return buildRegressionPayload(base, data);
    case "velocity":
      return buildVelocityPayload(base, data);
    case "digest":
      return buildDigestPayload(base, data);
    default:
      logger.warn(`Unknown alert type: ${alertType}, using generic payload`);
      return {...base, issueTitle: "Unknown alert type", issueId: null};
  }
}

/**
 * Builds payload for fatal/nonfatal/anr issues.
 * @param {object} base - Common fields
 * @param {object} data - Event data
 * @return {object} Issue payload
 */
function buildIssuePayload(base, data) {
  const issue = data.issue || data;
  return {
    ...base,
    issueId: issue.id || null,
    issueTitle: issue.title || issue.subtitle || "New issue detected",
    issueSubtitle: issue.subtitle || "",
    appVersion: issue.appVersion || "",
    crashCount: typeof issue.crashCount === "number" ? issue.crashCount : 0,
    crashPercentage: null,
    firstSeenAt: issue.createTime ? new Date(issue.createTime).getTime() : null,
  };
}

/**
 * Builds payload for regression alerts.
 * @param {object} base - Common fields
 * @param {object} data - Event data
 * @return {object} Regression payload
 */
function buildRegressionPayload(base, data) {
  const issue = data.issue || data;
  return {
    ...base,
    issueId: issue.id || null,
    issueTitle: `Regression: ${issue.title || "Issue has regressed"}`,
    issueSubtitle: issue.subtitle || "",
    appVersion: issue.appVersion || "",
    crashCount: typeof issue.crashCount === "number" ? issue.crashCount : 0,
    crashPercentage: null,
    firstSeenAt: issue.createTime ? new Date(issue.createTime).getTime() : null,
  };
}

/**
 * Builds payload for velocity (trending issue) alerts.
 * @param {object} base - Common fields
 * @param {object} data - Event data
 * @return {object} Velocity payload
 */
function buildVelocityPayload(base, data) {
  const issue = data.issue || data;
  return {
    ...base,
    issueId: issue.id || null,
    issueTitle: `Trending: ${issue.title || "Issue velocity increasing"}`,
    issueSubtitle: issue.subtitle || "",
    appVersion: issue.appVersion || "",
    crashCount: typeof issue.crashCount === "number" ? issue.crashCount : 0,
    crashPercentage: typeof issue.crashPercentage === "number" ? issue.crashPercentage : null,
    firstSeenAt: issue.createTime ? new Date(issue.createTime).getTime() : null,
  };
}

/**
 * Builds payload for stability digest.
 * @param {object} base - Common fields
 * @param {object} data - Event data
 * @return {object} Digest payload
 */
function buildDigestPayload(base, data) {
  const trendingIssues = data.trendingIssues || data.issues || [];
  const topIssue = trendingIssues[0] || {};

  return {
    ...base,
    issueId: topIssue.id || null,
    issueTitle: `Digest: ${trendingIssues.length} trending issue(s)`,
    issueSubtitle: topIssue.title || "",
    appVersion: topIssue.appVersion || "",
    crashCount: trendingIssues.reduce((sum, i) => sum + (i.crashCount || 0), 0),
    crashPercentage: null,
    firstSeenAt: null,
  };
}

module.exports = {
  buildPayload,
};
