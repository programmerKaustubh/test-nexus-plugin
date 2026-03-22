import { ConfigDiff, ParameterChange } from "./configDiffer";

export function applyWatchlistFilter(
  diff: ConfigDiff,
  watchlistKeysParam: string | undefined
): ConfigDiff {
  if (!watchlistKeysParam || watchlistKeysParam.trim() === "") {
    return diff;
  }

  const watchlistKeys = new Set(
    watchlistKeysParam
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0)
  );

  const updatedChanges = diff.changes.map((change) => ({
    ...change,
    isWatchlistKey: watchlistKeys.has(change.key),
  }));

  return {
    ...diff,
    changes: updatedChanges,
  };
}

export function shouldSendAlert(
  diff: ConfigDiff,
  notifyAllChanges: boolean
): boolean {
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

export function getWatchlistChanges(diff: ConfigDiff): ParameterChange[] {
  return diff.changes.filter((c) => c.isWatchlistKey);
}
