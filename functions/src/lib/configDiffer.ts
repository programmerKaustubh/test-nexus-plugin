import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v2";

export enum ChangeType {
  ADDED = "ADDED",
  MODIFIED = "MODIFIED",
  REMOVED = "REMOVED",
}

export interface ParameterChange {
  key: string;
  changeType: ChangeType;
  oldValue?: string;
  newValue?: string;
  isWatchlistKey: boolean;
}

export interface ConfigDiff {
  changes: ParameterChange[];
  totalChanged: number;
  totalAdded: number;
  totalModified: number;
  totalRemoved: number;
  isRollback: boolean;
  previousVersion: number;
  currentVersion: number;
}

export async function computeDiff(
  currentVersion: number,
  includeValues: boolean
): Promise<ConfigDiff> {
  const remoteConfig = admin.remoteConfig();

  const currentTemplate = await remoteConfig.getTemplate();
  const currentParams = currentTemplate.parameters || {};

  const versionInfo = currentTemplate.version;
  const isRollback =
    versionInfo?.updateType === "ROLLBACK" ||
    (versionInfo?.description || "").toLowerCase().includes("rollback");

  // Use the actual version number from the template, not the event parameter
  const actualCurrentVersion = parseInt(versionInfo?.versionNumber || String(currentVersion), 10) || currentVersion;

  let previousParams: Record<string, admin.remoteConfig.RemoteConfigParameter> = {};
  const previousVersion = actualCurrentVersion - 1;
  if (previousVersion > 0) {
    try {
      const previousTemplate = await remoteConfig.getTemplateAtVersion(
        previousVersion.toString()
      );
      previousParams = previousTemplate.parameters || {};
    } catch (err) {
      functions.logger.warn("Could not fetch previous version", { previousVersion, err });
    }
  }

  const changes: ParameterChange[] = [];

  for (const [key, param] of Object.entries(currentParams)) {
    const currentDefault = extractDefaultValue(param);
    if (key in previousParams) {
      const previousDefault = extractDefaultValue(previousParams[key]);
      const defaultChanged = currentDefault !== previousDefault;
      const conditionalsChanged = haveConditionalsChanged(param, previousParams[key]);

      if (defaultChanged || conditionalsChanged) {
        changes.push({
          key,
          changeType: ChangeType.MODIFIED,
          oldValue: includeValues ? previousDefault : undefined,
          newValue: includeValues ? currentDefault : undefined,
          isWatchlistKey: false,
        });
      }
    } else {
      changes.push({
        key,
        changeType: ChangeType.ADDED,
        newValue: includeValues ? currentDefault : undefined,
        isWatchlistKey: false,
      });
    }
  }

  for (const key of Object.keys(previousParams)) {
    if (!(key in currentParams)) {
      const previousDefault = extractDefaultValue(previousParams[key]);
      changes.push({
        key,
        changeType: ChangeType.REMOVED,
        oldValue: includeValues ? previousDefault : undefined,
        isWatchlistKey: false,
      });
    }
  }

  return {
    changes,
    totalChanged: changes.length,
    totalAdded: changes.filter((c) => c.changeType === ChangeType.ADDED).length,
    totalModified: changes.filter((c) => c.changeType === ChangeType.MODIFIED).length,
    totalRemoved: changes.filter((c) => c.changeType === ChangeType.REMOVED).length,
    isRollback,
    previousVersion,
    currentVersion: actualCurrentVersion,
  };
}

/**
 * Compares conditionalValues between two parameter versions.
 * Catches changes to platform-specific or country-specific values
 * even when the global default remains unchanged.
 */
function haveConditionalsChanged(
  current: admin.remoteConfig.RemoteConfigParameter,
  previous: admin.remoteConfig.RemoteConfigParameter
): boolean {
  const currentConds = current.conditionalValues || {};
  const previousConds = previous.conditionalValues || {};

  const allConditionKeys = new Set([
    ...Object.keys(currentConds),
    ...Object.keys(previousConds),
  ]);

  for (const condKey of allConditionKeys) {
    const currentVal = condKey in currentConds
      ? extractConditionalValue(currentConds[condKey])
      : undefined;
    const previousVal = condKey in previousConds
      ? extractConditionalValue(previousConds[condKey])
      : undefined;

    if (currentVal !== previousVal) {
      return true;
    }
  }

  return false;
}

function extractConditionalValue(
  condValue: admin.remoteConfig.RemoteConfigParameterValue
): string {
  if ("value" in condValue) {
    return (condValue as { value: string }).value;
  }
  if ("useInAppDefault" in condValue) {
    return "(in-app default)";
  }
  return "";
}

function extractDefaultValue(
  param: admin.remoteConfig.RemoteConfigParameter
): string {
  if (!param.defaultValue) return "";
  if ("value" in param.defaultValue) {
    return (param.defaultValue as { value: string }).value;
  }
  if ("useInAppDefault" in param.defaultValue) {
    return "(in-app default)";
  }
  return "";
}
