/**
 * Test Nexus App Health Watcher — Unified Firebase Extension
 *
 * Three independent triggers sharing common config and libraries:
 * 1. Crashlytics — Eventarc triggers for crash/ANR/regression events
 * 2. Remote Config — Eventarc trigger for config publishes/rollbacks
 * 3. Performance — Scheduled polling of Firebase Performance metrics
 *
 * Each trigger runs in its own Cloud Function container.
 * A failure in one cannot affect the others.
 */

import * as admin from "firebase-admin";
admin.initializeApp();

// Crashlytics triggers (6 Eventarc handlers)
export {
  onNewFatalIssue,
  onNewNonfatalIssue,
  onNewAnrIssue,
  onRegression,
  onVelocityAlert,
  onStabilityDigest,
} from "./triggers/crashlytics";

// Remote Config trigger
export { onConfigUpdated } from "./triggers/remoteConfig";

// Performance trigger
export { checkPerformanceMetrics } from "./triggers/performance";
