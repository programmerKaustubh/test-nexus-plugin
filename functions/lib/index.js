"use strict";
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
exports.checkPerformanceMetrics = exports.onConfigUpdated = exports.onStabilityDigest = exports.onVelocityAlert = exports.onRegression = exports.onNewAnrIssue = exports.onNewNonfatalIssue = exports.onNewFatalIssue = void 0;
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
// Crashlytics triggers (6 Eventarc handlers)
var crashlytics_1 = require("./triggers/crashlytics");
Object.defineProperty(exports, "onNewFatalIssue", { enumerable: true, get: function () { return crashlytics_1.onNewFatalIssue; } });
Object.defineProperty(exports, "onNewNonfatalIssue", { enumerable: true, get: function () { return crashlytics_1.onNewNonfatalIssue; } });
Object.defineProperty(exports, "onNewAnrIssue", { enumerable: true, get: function () { return crashlytics_1.onNewAnrIssue; } });
Object.defineProperty(exports, "onRegression", { enumerable: true, get: function () { return crashlytics_1.onRegression; } });
Object.defineProperty(exports, "onVelocityAlert", { enumerable: true, get: function () { return crashlytics_1.onVelocityAlert; } });
Object.defineProperty(exports, "onStabilityDigest", { enumerable: true, get: function () { return crashlytics_1.onStabilityDigest; } });
// Remote Config trigger
var remoteConfig_1 = require("./triggers/remoteConfig");
Object.defineProperty(exports, "onConfigUpdated", { enumerable: true, get: function () { return remoteConfig_1.onConfigUpdated; } });
// Performance trigger
var performance_1 = require("./triggers/performance");
Object.defineProperty(exports, "checkPerformanceMetrics", { enumerable: true, get: function () { return performance_1.checkPerformanceMetrics; } });
//# sourceMappingURL=index.js.map