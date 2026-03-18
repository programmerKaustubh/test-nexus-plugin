import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { getConfig } from "../config";
import { PerfApiClient } from "../lib/perfApiClient";
import { ThresholdEvaluator } from "../lib/thresholdEvaluator";
import { sendToTestNexus } from "../lib/httpClient";

const { logger } = functions;

// Exported as an HTTPS function — extension.yaml's scheduleTrigger creates a
// Cloud Scheduler job that calls this function via HTTP every 5 minutes
export const checkPerformanceMetrics = functions.https.onRequest(async (_req, res) => {
    try {
      const config = getConfig();

      if (!config.connectionTokens || config.connectionTokens.length === 0) {
        logger.warn("No connection tokens configured, skipping performance check");
        return;
      }

      if (!config.projectId) {
        logger.warn("No projectId configured, skipping performance check");
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
        res.status(200).send("No metrics available — check IAM permissions");
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
        return;
      }

      // Send each breach as an individual alert (max 3 to prevent spam)
      const breachesToSend = breaches.slice(0, 3);
      let successCount = 0;

      for (const breach of breachesToSend) {
        const payload = {
          alertType: breach.alertType,
          appIdentifier: config.appIdentifier,
          metricName: breach.metricName,
          currentValue: breach.currentValue,
          thresholdValue: breach.thresholdValue,
          unit: breach.unit,
          sampleCount: breach.sampleCount,
          resourceName: breach.resourceName,
          summary: `${breach.metricName}: ${breach.currentValue}${breach.unit} (threshold: ${breach.thresholdValue}${breach.unit})`,
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

      res.status(200).send("OK");
    } catch (err) {
      logger.error("Performance check failed", {
        error: (err as Error).message,
      });
      res.status(500).send("Error");
    }
  }
);
