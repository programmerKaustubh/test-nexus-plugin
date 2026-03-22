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
exports.computeDiff = exports.ChangeType = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions/v2"));
var ChangeType;
(function (ChangeType) {
    ChangeType["ADDED"] = "ADDED";
    ChangeType["MODIFIED"] = "MODIFIED";
    ChangeType["REMOVED"] = "REMOVED";
})(ChangeType || (exports.ChangeType = ChangeType = {}));
async function computeDiff(currentVersion, includeValues) {
    const remoteConfig = admin.remoteConfig();
    const currentTemplate = await remoteConfig.getTemplate();
    const currentParams = currentTemplate.parameters || {};
    const versionInfo = currentTemplate.version;
    const isRollback = versionInfo?.updateType === "ROLLBACK" ||
        (versionInfo?.description || "").toLowerCase().includes("rollback");
    // Use the actual version number from the template, not the event parameter
    const actualCurrentVersion = parseInt(versionInfo?.versionNumber || String(currentVersion), 10) || currentVersion;
    let previousParams = {};
    const previousVersion = actualCurrentVersion - 1;
    if (previousVersion > 0) {
        try {
            const previousTemplate = await remoteConfig.getTemplateAtVersion(previousVersion.toString());
            previousParams = previousTemplate.parameters || {};
        }
        catch (err) {
            functions.logger.warn("Could not fetch previous version", { previousVersion, err });
        }
    }
    const changes = [];
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
        }
        else {
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
exports.computeDiff = computeDiff;
/**
 * Compares conditionalValues between two parameter versions.
 * Catches changes to platform-specific or country-specific values
 * even when the global default remains unchanged.
 */
function haveConditionalsChanged(current, previous) {
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
function extractConditionalValue(condValue) {
    if ("value" in condValue) {
        return condValue.value;
    }
    if ("useInAppDefault" in condValue) {
        return "(in-app default)";
    }
    return "";
}
function extractDefaultValue(param) {
    if (!param.defaultValue)
        return "";
    if ("value" in param.defaultValue) {
        return param.defaultValue.value;
    }
    if ("useInAppDefault" in param.defaultValue) {
        return "(in-app default)";
    }
    return "";
}
//# sourceMappingURL=configDiffer.js.map