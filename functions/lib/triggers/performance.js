"use strict";
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
exports.checkPerformanceMetrics = void 0;
const functions = __importStar(require("firebase-functions"));
const firebase_functions_1 = require("firebase-functions");
const admin = __importStar(require("firebase-admin"));
const config_1 = require("../config");
const perfApiClient_1 = require("../lib/perfApiClient");
const thresholdEvaluator_1 = require("../lib/thresholdEvaluator");
const httpClient_1 = require("../lib/httpClient");
const sanitizer_1 = require("../lib/sanitizer");
// Exported as an HTTPS function — extension.yaml's scheduleTrigger invokes it
// via Cloud Scheduler → Pub/Sub → HTTP wrapper. The res object may not be a
// standard HTTP response when invoked through Pub/Sub, so we guard all res calls.
exports.checkPerformanceMetrics = functions.https.onRequest(async (_req, res) => {
    const sendResponse = (code, msg) => {
        try {
            if (res && typeof res.status === "function") {
                res.status(code).send(msg);
            }
        }
        catch {
            // Pub/Sub invocation — no HTTP response needed
        }
    };
    try {
        const config = (0, config_1.getConfig)();
        if (!config.connectionTokens || config.connectionTokens.length === 0) {
            firebase_functions_1.logger.warn("No connection tokens configured, skipping performance check");
            sendResponse(200, "No tokens configured");
            return;
        }
        if (!config.projectId) {
            firebase_functions_1.logger.warn("No projectId configured, skipping performance check");
            sendResponse(200, "No projectId configured");
            return;
        }
        const perfClient = new perfApiClient_1.PerfApiClient({
            projectId: config.projectId,
            timeWindowMinutes: config.perfCheckInterval,
        });
        const metrics = await perfClient.fetchMetrics();
        // Check if ALL metrics are empty — likely an API permission issue
        const totalMetrics = metrics.networkRequests.length +
            metrics.screenRenders.length +
            metrics.customTraces.length;
        if (totalMetrics === 0) {
            firebase_functions_1.logger.warn("All performance metric fetches returned empty results. " +
                "This usually means the extension's service account lacks the Monitoring Viewer IAM role. " +
                "Grant the role at: https://console.cloud.google.com/iam-admin/iam?project=" + config.projectId);
            sendResponse(200, "No metrics available — check IAM permissions");
            return;
        }
        const evaluator = new thresholdEvaluator_1.ThresholdEvaluator({
            apiLatencyThresholdMs: config.latencyThresholdMs,
            screenRenderThresholdMs: config.screenRenderThresholdMs,
            successRateThresholdPct: config.successRateThresholdPct,
            customTraceThresholds: config.customTraceThresholds,
            dedupWindowMinutes: config.dedupWindowMinutes,
        }, admin.firestore());
        const breaches = await evaluator.evaluate(metrics);
        if (breaches.length === 0) {
            firebase_functions_1.logger.info("No performance threshold breaches detected");
            sendResponse(200, "No breaches");
            return;
        }
        // Send each breach as an individual alert (max 3 to prevent spam)
        const breachesToSend = breaches.slice(0, 3);
        let successCount = 0;
        for (const breach of breachesToSend) {
            const payload = {
                alertType: breach.alertType,
                appIdentifier: (0, sanitizer_1.sanitizeField)(config.appIdentifier, 100),
                metricName: (0, sanitizer_1.sanitizeField)(breach.metricName, 200),
                currentValue: breach.currentValue,
                thresholdValue: breach.thresholdValue,
                unit: (0, sanitizer_1.sanitizeField)(breach.unit, 20),
                sampleCount: breach.sampleCount,
                resourceName: (0, sanitizer_1.sanitizeField)(breach.resourceName, 300),
                summary: (0, sanitizer_1.sanitizeField)(`${breach.metricName}: ${breach.currentValue}${breach.unit} (threshold: ${breach.thresholdValue}${breach.unit})`, 500),
            };
            const success = await (0, httpClient_1.sendToTestNexus)(payload, config.connectionTokens, config.apiBaseUrl, "/receivePerformanceAlert");
            if (success)
                successCount++;
        }
        firebase_functions_1.logger.info("Performance alerts sent", {
            sent: successCount,
            total: breaches.length,
            capped: breaches.length > 3 ? `${breaches.length - 3} additional breaches not sent` : undefined,
        });
        sendResponse(200, "OK");
    }
    catch (err) {
        firebase_functions_1.logger.error("Performance check failed", {
            error: err.message,
        });
        sendResponse(500, "Error");
    }
});
//# sourceMappingURL=performance.js.map