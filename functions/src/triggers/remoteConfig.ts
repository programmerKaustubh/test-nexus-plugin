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

import * as functions from "firebase-functions/v2";
import { getConfig } from "../config";
import { sendToTestNexus } from "../lib/httpClient";
import { sanitizeField } from "../lib/sanitizer";

export const onConfigUpdated = functions.remoteConfig.onConfigUpdated(
  async (event) => {
    try {
      const config = getConfig();

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
        appIdentifier: sanitizeField(config.appIdentifier, 100),
        versionNumber,
        previousVersionNumber: previousVersion,
        updatedBy: sanitizeField(updateUser, 200),
        updateOrigin: sanitizeField(updateOrigin, 50),
        totalChanges: 0, // Not available without getTemplate()
        changedKeys: [],  // Not available without getTemplate()
        changedParameters: [],
        watchlistChanges: [],
        rollbackSource: isRollback ? previousVersion : null,
        summary: sanitizeField(summary, 500),
      };

      await sendToTestNexus(
        payload,
        config.connectionTokens,
        config.apiBaseUrl,
        "/receiveConfigAlert"
      );

      functions.logger.info("Config alert sent successfully", {
        alertType,
        versionNumber,
        updatedBy: updateUser,
      });
    } catch (err: any) {
      functions.logger.error("Config alert handler failed", {
        error: err?.message || String(err),
        stack: err?.stack || "no stack",
      });
    }
  }
);
