"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWatchlistChanges = exports.shouldSendAlert = exports.applyWatchlistFilter = void 0;
function applyWatchlistFilter(diff, watchlistKeysParam) {
    if (!watchlistKeysParam || watchlistKeysParam.trim() === "") {
        return diff;
    }
    const watchlistKeys = new Set(watchlistKeysParam
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k.length > 0));
    const updatedChanges = diff.changes.map((change) => ({
        ...change,
        isWatchlistKey: watchlistKeys.has(change.key),
    }));
    return {
        ...diff,
        changes: updatedChanges,
    };
}
exports.applyWatchlistFilter = applyWatchlistFilter;
function shouldSendAlert(diff, notifyAllChanges) {
    if (diff.totalChanged === 0) {
        return false;
    }
    if (diff.isRollback) {
        return true;
    }
    if (notifyAllChanges) {
        return true;
    }
    return diff.changes.some((c) => c.isWatchlistKey);
}
exports.shouldSendAlert = shouldSendAlert;
function getWatchlistChanges(diff) {
    return diff.changes.filter((c) => c.isWatchlistKey);
}
exports.getWatchlistChanges = getWatchlistChanges;
//# sourceMappingURL=watchlistFilter.js.map