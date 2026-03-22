"use strict";
/**
 * Remote Config Trigger — Approach A (Event Metadata Only)
 *
 * Uses the onConfigUpdated event data directly (versionNumber, updateType,
 * updateOrigin, updateUser). Does NOT call getTemplate() — avoids needing
 * the cloudconfig.admin IAM role.
 *
 * The user sees: who changed it, what version, and the update type.
 * Parameter-level diffs (old→new values) will be added in a future version
 * using the REST API with OAuth scopes (Approach B).
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
exports.onConfigUpdated = void 0;
const functions = __importStar(require("firebase-functions/v2"));
const config_1 = require("../config");
const httpClient_1 = require("../lib/httpClient");
const sanitizer_1 = require("../lib/sanitizer");
exports.onConfigUpdated = functions.remoteConfig.onConfigUpdated(async (event) => {
    try {
        const config = (0, config_1.getConfig)();
        if (!config.connectionTokens || config.connectionTokens.length === 0) {
            functions.logger.warn("No connection tokens configured, skipping config alert");
            return;
        }
        // Extract metadata from the event — no API call needed
        const versionNumber = event.data.versionNumber ?? 0;
        const updateType = event.data.updateType ?? "INCREMENTAL_UPDATE";
        const updateOrigin = event.data.updateOrigin ?? "CONSOLE";
        const updateUser = event.data.updateUser?.email ?? "unknown";
        functions.logger.info("Remote Config event received", {
            versionNumber,
            updateType,
            updateOrigin,
            updateUser: updateUser !== "unknown" ? updateUser.split("@")[0][0] + "***@" + updateUser.split("@")[1] : "unknown",
        });
        // Determine alert type from event metadata
        const isRollback = updateType === "ROLLBACK";
        const alertType = isRollback ? "config_rollback" : "config_published";
        // Build summary
        const previousVersion = versionNumber > 0 ? versionNumber - 1 : 0;
        const summary = isRollback
            ? `Remote Config rolled back to version ${versionNumber} by ${updateUser}`
            : `Remote Config version ${versionNumber} published by ${updateUser}`;
        const payload = {
            category: "config",
            alertType,
            appIdentifier: (0, sanitizer_1.sanitizeField)(config.appIdentifier, 100),
            versionNumber,
            previousVersionNumber: previousVersion,
            updatedBy: (0, sanitizer_1.sanitizeField)(updateUser, 200),
            updateOrigin: (0, sanitizer_1.sanitizeField)(updateOrigin, 50),
            totalChanges: 0, // Not available without getTemplate()
            changedKeys: [], // Not available without getTemplate()
            changedParameters: [],
            watchlistChanges: [],
            rollbackSource: isRollback ? previousVersion : null,
            summary: (0, sanitizer_1.sanitizeField)(summary, 500),
        };
        await (0, httpClient_1.sendToTestNexus)(payload, config.connectionTokens, config.apiBaseUrl, "/receiveConfigAlert");
        functions.logger.info("Config alert sent successfully", {
            alertType,
            versionNumber,
            updatedBy: updateUser,
        });
    }
    catch (err) {
        functions.logger.error("Config alert handler failed", {
            error: err?.message || String(err),
            stack: err?.stack || "no stack",
        });
    }
});
//# sourceMappingURL=remoteConfig.js.map