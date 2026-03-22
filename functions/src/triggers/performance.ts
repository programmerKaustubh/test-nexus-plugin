import * as functions from "firebase-functions";
import {logger} from "firebase-functions";
import * as admin from "firebase-admin";
import { getConfig } from "../config";
import { PerfApiClient } from "../lib/perfApiClient";
import { ThresholdEvaluator } from "../lib/thresholdEvaluator";
import { sendToTestNexus } from "../lib/httpClient";
import { sanitizeField } from "../lib/sanitizer";

// Exported as an HTTPS function — extension.yaml's scheduleTrigger invokes it
// via Cloud Scheduler → Pub/Sub → HTTP wrapper. The res object may not be a
// standard HTTP response when invoked through Pub/Sub, so we guard all res calls.
export const checkPerformanceMetrics = functions.https.onRequest(async (_req, res) => {
    const sendResponse = (code: number, msg: string) => {
      try {
        if (res && typeof res.status === "function") {
          res.status(code).send(msg);
        }
      } catch {
        // Pub/Sub invocation — no HTTP response needed
      }
    };

    try {
      const config = getConfig();

      if (!config.connectionTokens || config.connectionTokens.length === 0) {
        logger.warn("No connection tokens configured, skipping performance check");
        sendResponse(200, "No tokens configured");
        return;
      }

      if (!config.projectId) {
        logger.warn("No projectId configured, skipping performance check");
        sendResponse(200, "No projectId configured");
        return;
      }

      const perfClient = new PerfApiClient({
        projectId: config.projectId,
        timeWindowMinutes: config.perfCheckInterval,
      });
      const metrics = await perfClient.fetchMetrics();

      // Check if ALL metrics are empty — likely an API permission issue
      const totalMetrics = metrics.networkRequests.length +
        metrics.screenRenders.length +
        metrics.customTraces.length;

      if (totalMetrics === 0) {
        logger.warn(
          "All performance metric fetches returned empty results. " +
          "This usually means the extension's service account lacks the Monitoring Viewer IAM role. " +
          "Grant the role at: https://console.cloud.google.com/iam-admin/iam?project=" + config.projectId
        );
        sendResponse(200, "No metrics available — check IAM permissions");
        return;
      }

      const evaluator = new ThresholdEvaluator(
        {
          apiLatencyThresholdMs: config.latencyThresholdMs,
          screenRenderThresholdMs: config.screenRenderThresholdMs,
          successRateThresholdPct: config.successRateThresholdPct,
          customTraceThresholds: config.customTraceThresholds,
          dedupWindowMinutes: config.dedupWindowMinutes,
        },
        admin.firestore()
      );
      const breaches = await evaluator.evaluate(metrics);

      if (breaches.length === 0) {
        logger.info("No performance threshold breaches detected");
        sendResponse(200, "No breaches");
        return;
      }

      // Send each breach as an individual alert (max 3 to prevent spam)
      const breachesToSend = breaches.slice(0, 3);
      let successCount = 0;

      for (const breach of breachesToSend) {
        const payload = {
          alertType: breach.alertType,
          appIdentifier: sanitizeField(config.appIdentifier, 100),
          metricName: sanitizeField(breach.metricName, 200),
          currentValue: breach.currentValue,
          thresholdValue: breach.thresholdValue,
          unit: sanitizeField(breach.unit, 20),
          sampleCount: breach.sampleCount,
          resourceName: sanitizeField(breach.resourceName, 300),
          summary: sanitizeField(
            `${breach.metricName}: ${breach.currentValue}${breach.unit} (threshold: ${breach.thresholdValue}${breach.unit})`,
            500
          ),
        };

        const success = await sendToTestNexus(
          payload,
          config.connectionTokens,
          config.apiBaseUrl,
          "/receivePerformanceAlert"
        );

        if (success) successCount++;
      }

      logger.info("Performance alerts sent", {
        sent: successCount,
        total: breaches.length,
        capped: breaches.length > 3 ? `${breaches.length - 3} additional breaches not sent` : undefined,
      });

      sendResponse(200, "OK");
    } catch (err) {
      logger.error("Performance check failed", {
        error: (err as Error).message,
      });
      sendResponse(500, "Error");
    }
  }
);
