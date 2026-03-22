"use strict";
/**
 * Unified HTTP client for forwarding alerts to the TestNexus backend.
 *
 * Supports all trigger types (Crashlytics, Remote Config, Performance) via
 * an `endpoint` parameter that targets different backend Cloud Functions.
 * Includes retry with exponential backoff for transient server errors.
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendToTestNexus = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
const functions = __importStar(require("firebase-functions/v2"));
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 3000, 9000];
const REQUEST_TIMEOUT_MS = 10000;
const EXTENSION_VERSION = "2.0.0";
/**
 * Mask a connection token for safe logging.
 * Shows only the first 6 characters followed by "***".
 */
function maskToken(token) {
    if (token.length <= 6)
        return "***";
    return `${token.substring(0, 6)}***`;
}
/**
 * Send a payload to TestNexus for each configured connection token.
 *
 * @param payload - The alert payload to send
 * @param connectionTokens - List of connection tokens (one request per token)
 * @param apiBaseUrl - The base URL of the TestNexus backend
 * @param endpoint - The endpoint path, e.g. "/receiveCrashlyticsAlert"
 * @returns true if at least one token succeeded
 */
async function sendToTestNexus(payload, connectionTokens, apiBaseUrl, endpoint) {
    if (connectionTokens.length === 0) {
        functions.logger.error("No connection tokens configured");
        return false;
    }
    // Send to all tokens in parallel — independent deliveries shouldn't block each other
    const results = await Promise.allSettled(connectionTokens.map((token) => sendWithRetry(payload, token, apiBaseUrl, endpoint)));
    let anySuccess = false;
    for (const result of results) {
        if (result.status === "fulfilled" && result.value)
            anySuccess = true;
    }
    return anySuccess;
}
exports.sendToTestNexus = sendToTestNexus;
/**
 * Send a single request with retry logic.
 *
 * - Retries on 5xx responses with delays [1000, 3000, 9000] ms.
 * - Fails fast on 4xx responses (client error, no retry will help).
 * - Times out after 10 seconds per attempt.
 *
 * @returns true if the request ultimately succeeded (2xx)
 */
async function sendWithRetry(payload, token, apiBaseUrl, endpoint) {
    const url = `${apiBaseUrl}${endpoint}`;
    const masked = maskToken(token);
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        // Wait before retry (skip delay on first attempt)
        if (attempt > 0) {
            const delay = RETRY_DELAYS[attempt - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
            functions.logger.info(`Retry ${attempt}/${MAX_RETRIES} for token ${masked} after ${delay}ms`);
            await sleep(delay);
        }
        let response;
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
            response = await (0, node_fetch_1.default)(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                    "X-Extension-Version": EXTENSION_VERSION,
                    "X-TestNexus-Source": "app-health-watcher",
                    "X-TestNexus-Version": EXTENSION_VERSION,
                },
                body: JSON.stringify(payload),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
        }
        catch (error) {
            const message = error?.name === "AbortError"
                ? "Request timed out"
                : error?.message || "Unknown network error";
            functions.logger.error(`Token ${masked}: attempt ${attempt + 1} failed — ${message}`);
            // Network errors are retryable
            if (attempt === MAX_RETRIES) {
                functions.logger.error(`Token ${masked}: all ${MAX_RETRIES + 1} attempts exhausted`);
                return false;
            }
            continue;
        }
        // 2xx — success
        if (response.status >= 200 && response.status < 300) {
            let body;
            try {
                body = await response.json();
            }
            catch {
                body = null;
            }
            if (body?.skipped) {
                functions.logger.warn(`Token ${masked}: alert SKIPPED by backend — ${body.skipped}`, {
                    statusCode: response.status,
                    skipped: body.skipped,
                });
            }
            else {
                functions.logger.info(`Token ${masked}: forwarded successfully`, {
                    statusCode: response.status,
                    alertId: body?.alertId,
                    notifiedUsers: body?.notifiedUsers,
                });
            }
            return true;
        }
        // 4xx — client error, fail fast (no retry)
        if (response.status >= 400 && response.status < 500) {
            let body;
            try {
                body = await response.text();
            }
            catch {
                body = "(unable to read body)";
            }
            functions.logger.error(`Token ${masked}: client error HTTP ${response.status} — ${body}`);
            return false;
        }
        // 5xx — server error, retryable
        functions.logger.warn(`Token ${masked}: server error HTTP ${response.status}, attempt ${attempt + 1}`);
        if (attempt === MAX_RETRIES) {
            functions.logger.error(`Token ${masked}: all ${MAX_RETRIES + 1} attempts exhausted (last status: ${response.status})`);
            return false;
        }
    }
    return false;
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
//# sourceMappingURL=httpClient.js.map