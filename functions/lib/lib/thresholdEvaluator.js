"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThresholdEvaluator = void 0;
const DEDUP_COLLECTION = "_ext_perf_dedup";
class ThresholdEvaluator {
    config;
    db;
    constructor(config, db) {
        this.config = config;
        this.db = db;
    }
    async evaluate(metrics) {
        const breaches = [];
        for (const req of metrics.networkRequests) {
            this.evaluateNetworkLatency(req, breaches);
            this.evaluateSuccessRate(req, breaches);
        }
        for (const screen of metrics.screenRenders) {
            this.evaluateScreenRender(screen, breaches);
        }
        for (const trace of metrics.customTraces) {
            this.evaluateCustomTrace(trace, breaches);
        }
        if (breaches.length === 0) {
            return [];
        }
        return this.dedup(breaches);
    }
    evaluateNetworkLatency(req, breaches) {
        if (req.p95LatencyMs > this.config.apiLatencyThresholdMs) {
            breaches.push({
                alertType: "perf_threshold_breach",
                metricName: "p95_latency",
                currentValue: req.p95LatencyMs,
                thresholdValue: this.config.apiLatencyThresholdMs,
                unit: "ms",
                direction: "above",
                sampleCount: req.sampleCount,
                resourceName: req.url,
            });
        }
    }
    evaluateSuccessRate(req, breaches) {
        const successPct = req.successRate * 100;
        if (successPct < this.config.successRateThresholdPct) {
            breaches.push({
                alertType: "perf_network_anomaly",
                metricName: "success_rate",
                currentValue: successPct,
                thresholdValue: this.config.successRateThresholdPct,
                unit: "%",
                direction: "below",
                sampleCount: req.sampleCount,
                resourceName: req.url,
            });
        }
    }
    evaluateScreenRender(screen, breaches) {
        if (screen.renderTimeMs > this.config.screenRenderThresholdMs) {
            breaches.push({
                alertType: "perf_threshold_breach",
                metricName: "screen_render_time",
                currentValue: screen.renderTimeMs,
                thresholdValue: this.config.screenRenderThresholdMs,
                unit: "ms",
                direction: "above",
                sampleCount: screen.sampleCount,
                resourceName: screen.screenName,
            });
        }
    }
    evaluateCustomTrace(trace, breaches) {
        const threshold = this.config.customTraceThresholds[trace.traceName];
        if (threshold === undefined) {
            return;
        }
        if (trace.durationMs > threshold) {
            breaches.push({
                alertType: "perf_custom_trace",
                metricName: "trace_duration",
                currentValue: trace.durationMs,
                thresholdValue: threshold,
                unit: "ms",
                direction: "above",
                sampleCount: trace.sampleCount,
                resourceName: trace.traceName,
            });
        }
    }
    async dedup(breaches) {
        const dedupWindowMs = this.config.dedupWindowMinutes * 60 * 1000;
        const now = Date.now();
        const result = [];
        for (const breach of breaches) {
            // Hash the key — resourceName can contain slashes (URLs) which are invalid in Firestore doc IDs
            const rawKey = `${breach.alertType}_${breach.resourceName}_${breach.metricName}`;
            const dedupKey = require("crypto").createHash("md5").update(rawKey).digest("hex");
            const docRef = this.db.collection(DEDUP_COLLECTION).doc(dedupKey);
            const doc = await docRef.get();
            if (doc.exists) {
                const lastAlertedAt = doc.data()?.lastAlertedAt ?? 0;
                if (now - lastAlertedAt < dedupWindowMs) {
                    continue;
                }
            }
            await docRef.set({ lastAlertedAt: now });
            result.push(breach);
        }
        return result;
    }
}
exports.ThresholdEvaluator = ThresholdEvaluator;
//# sourceMappingURL=thresholdEvaluator.js.map